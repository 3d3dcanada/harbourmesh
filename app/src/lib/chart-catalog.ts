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

export type NBPilotChartPackageArtifact = {
  id: string;
  packageId: string;
  region: 'NB_PILOT';
  format: 'geojson' | 'mbtiles' | 'pmtiles';
  mediaType: 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';
  fileName: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  officialChartDataIncluded: false;
  sourceIds: string[];
  excludedSourceIds: string[];
  warnings: string[];
  sourceFeatureCount: number;
  sourceFeatureSummaries: Array<{
    sourceId: string;
    sourceLabel: string;
    fetchedFeatureCount: number;
    maxFeatures: number;
    truncated: boolean;
  }>;
  content?: {
    type: 'FeatureCollection';
    metadata: {
      schemaVersion: 'harbourmesh.chart-package-artifact-content.v1';
      officialChartDataIncluded: false;
      referenceOnly: true;
      sourceFeatureCount: number;
    };
  };
  tileSummary?: {
    layerName: 'harbourmesh_reference';
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: NBPilotChartPackage['bounds'];
  };
};

export type NBPilotChartPackageArtifactManifest = {
  id: 'nb-pilot-chart-package-artifacts';
  schemaVersion: 'harbourmesh.chart-package-artifacts.v1';
  generatedAt: string;
  artifacts: NBPilotChartPackageArtifact[];
  rules: {
    artifactsAreReferenceOnly: boolean;
    officialChartDataExcluded: boolean;
    pmtilesGenerationPending: boolean;
    mbtilesGenerationPending: boolean;
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

function isChartPackageManifest(value: unknown): value is NBPilotChartPackageManifest {
  const manifest = value as Partial<NBPilotChartPackageManifest>;
  return (
    manifest.id === 'nb-pilot-chart-packages' &&
    manifest.schemaVersion === 'harbourmesh.chart-packages.v1' &&
    typeof manifest.generatedAt === 'string' &&
    manifest.rules?.officialChartDataExcluded === true &&
    Array.isArray(manifest.packages) &&
    manifest.packages.every((chartPackage) => (
      typeof chartPackage.id === 'string' &&
      chartPackage.region === 'NB_PILOT' &&
      chartPackage.intendedUse === 'reference_only' &&
      chartPackage.officialChartDataIncluded === false &&
      Array.isArray(chartPackage.sourceIds) &&
      Array.isArray(chartPackage.excludedSourceIds) &&
      Array.isArray(chartPackage.formats)
    ))
  );
}

function isChartPackageArtifactManifest(value: unknown): value is NBPilotChartPackageArtifactManifest {
  const manifest = value as Partial<NBPilotChartPackageArtifactManifest>;
  return (
    manifest.id === 'nb-pilot-chart-package-artifacts' &&
    manifest.schemaVersion === 'harbourmesh.chart-package-artifacts.v1' &&
    typeof manifest.generatedAt === 'string' &&
    manifest.rules?.officialChartDataExcluded === true &&
    Array.isArray(manifest.artifacts) &&
    manifest.artifacts.every((artifact) => (
      typeof artifact.id === 'string' &&
      artifact.region === 'NB_PILOT' &&
      (artifact.format === 'geojson' || artifact.format === 'mbtiles' || artifact.format === 'pmtiles') &&
      (
        (artifact.format === 'geojson' && artifact.mediaType === 'application/geo+json') ||
        (artifact.format === 'mbtiles' && artifact.mediaType === 'application/x-sqlite3') ||
        (artifact.format === 'pmtiles' && artifact.mediaType === 'application/vnd.pmtiles')
      ) &&
      artifact.officialChartDataIncluded === false &&
      typeof artifact.byteLength === 'number' &&
      /^[a-f0-9]{64}$/.test(artifact.sha256) &&
      Array.isArray(artifact.sourceIds) &&
      Array.isArray(artifact.excludedSourceIds) &&
      typeof artifact.sourceFeatureCount === 'number' &&
      Array.isArray(artifact.sourceFeatureSummaries) &&
      (
        artifact.format === 'geojson'
          ? artifact.content?.type === 'FeatureCollection' &&
            artifact.content.metadata?.officialChartDataIncluded === false
          : artifact.tileSummary?.layerName === 'harbourmesh_reference' &&
            typeof artifact.tileSummary.tileCount === 'number'
      )
    ))
  );
}

export function getCommunitySafeChartSources(catalog: NBPilotChartCatalog): NBPilotChartSource[] {
  return catalog.sources.filter((source) => source.sharePolicy.mayUploadToCommunityMesh);
}

export function getLocalOnlyOfficialChartSources(catalog: NBPilotChartCatalog): NBPilotChartSource[] {
  return catalog.sources.filter((source) => source.sharePolicy.handling === 'local-only-official');
}

export function getOfflineReadyChartPackages(manifest: NBPilotChartPackageManifest): NBPilotChartPackage[] {
  return manifest.packages.filter((chartPackage) => chartPackage.status === 'ready');
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

export async function fetchNBPilotChartPackageManifest(
  options: FetchNBPilotChartCatalogOptions = {}
): Promise<NBPilotChartPackageManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/charts/nb/packages', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Chart package manifest request failed with HTTP ${response.status}`);
  }

  if (!isChartPackageManifest(body)) {
    throw new Error('Chart package response was not a HarbourMesh NB package manifest');
  }

  return body;
}

export async function fetchNBPilotChartPackageArtifacts(
  options: FetchNBPilotChartCatalogOptions = {}
): Promise<NBPilotChartPackageArtifactManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/charts/nb/package-artifacts', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Chart package artifact request failed with HTTP ${response.status}`);
  }

  if (!isChartPackageArtifactManifest(body)) {
    throw new Error('Chart package artifact response was not a HarbourMesh NB artifact manifest');
  }

  return body;
}

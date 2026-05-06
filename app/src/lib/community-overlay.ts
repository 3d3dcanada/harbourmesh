import { buildAccountSessionHeaders, type StorageLike } from './account-session';
import { resolvePilotReviewCredential } from './pilot-api-credentials';

export type CommunityOverlayFeature = {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number | boolean | null>;
};

export type CommunityAggregateFeature = {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon';
    coordinates: [[
      [number, number],
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ]];
  };
  properties: {
    kind: 'aggregate_cell';
    cellId: string;
    cellSizeDegrees: number;
    region: string;
    soundingCount: number;
    observationCount: number;
    weatherObservationCount: number;
    conditionObservationCount: number;
    trackPointObservationCount: number;
    aisTargetObservationCount: number;
    radarContactObservationCount: number;
    healthObservationCount: number;
    hazardCount: number;
    highHazardCount: number;
    mediumHazardCount: number;
    lowHazardCount: number;
    minDepthMeters: number | null;
    maxDepthMeters: number | null;
    averageDepthMeters: number | null;
    averageConfidence: number | null;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    officialChartDataIncluded: false;
  };
};

export type CommunityGeoJsonOverlay = {
  type: 'FeatureCollection';
  features: CommunityOverlayFeature[];
  metadata: {
    schemaVersion: 'harbourmesh.community-overlay.v1';
    generatedAt: string;
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    communityProductsAreReferenceOnly: true;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    sourceDeviceIdsIncluded: false;
    sourceRecordCounts: {
      soundings: number;
      hazards: number;
      omittedUnpositionedHazards: number;
    };
  };
};

export type CommunityAggregateGeoJson = {
  type: 'FeatureCollection';
  features: CommunityAggregateFeature[];
  metadata: {
    schemaVersion: 'harbourmesh.community-aggregates.v1';
    generatedAt: string;
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    communityProductsAreReferenceOnly: true;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    cellSizeDegrees: number;
    sourceRecordCounts: {
      soundings: number;
      acceptedSoundings: number;
      rejectedSoundings: number;
      observations: number;
      positionedObservations: number;
      hazards: number;
      publicHazards: number;
      aggregateCells: number;
    };
  };
};

export type CommunityAggregateReleaseManifest = {
  id: string;
  schemaVersion: 'harbourmesh.community-aggregate-release.v1';
  generatedAt: string;
  region: 'NB_PILOT';
  productKind: 'aggregate_geojson';
  product: {
    fileName: string;
    mediaType: 'application/geo+json';
    byteLength: number;
    sha256: string;
    sourceRecordCounts: CommunityAggregateGeoJson['metadata']['sourceRecordCounts'];
    aggregateCells: number;
  };
  rules: {
    intendedUse: 'community_reference_overlay';
    communityProductsAreReferenceOnly: true;
    officialChartDataIncluded: false;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
  };
  approval?: {
    required: boolean;
    approvedBy: string;
    approvedAt: string;
    checklist: {
      referenceOnly: true;
      officialChartDataExcluded: true;
      rawRecordIdsExcluded: true;
      vesselIdsExcluded: true;
    };
    notes?: string;
  };
};

export type CommunityAggregateReleaseArtifact = {
  id: string;
  releaseId: string;
  region: 'NB_PILOT';
  format: 'geojson' | 'mbtiles' | 'pmtiles';
  mediaType: 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';
  fileName: string;
  downloadPath: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  aggregateCells: number;
  officialChartDataIncluded: false;
  rawRecordIdsIncluded: false;
  vesselIdsIncluded: false;
  warnings: string[];
  content?: CommunityAggregateGeoJson;
  tileSummary?: {
    layerName: 'harbourmesh_community_aggregate';
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: {
      south: number;
      west: number;
      north: number;
      east: number;
    };
  };
};

export type CommunityAggregateReleaseArtifactManifest = {
  id: string;
  schemaVersion: 'harbourmesh.community-aggregate-release-artifacts.v1';
  releaseId: string;
  generatedAt: string;
  artifacts: CommunityAggregateReleaseArtifact[];
  rules: {
    artifactsAreReferenceOnly: true;
    officialChartDataExcluded: true;
    rawRecordIdsExcluded: true;
    vesselIdsExcluded: true;
    vectorTileGenerationPending: boolean;
  };
};

export type CommunityHazardArtifact = {
  id: string;
  region: 'NB_PILOT';
  format: 'geojson' | 'mbtiles' | 'pmtiles';
  mediaType: 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';
  fileName: string;
  downloadPath: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  hazardFeatures: number;
  officialChartDataIncluded: false;
  rawRecordIdsIncluded: false;
  vesselIdsIncluded: false;
  sourceDeviceIdsIncluded: false;
  warnings: string[];
  tileSummary?: {
    layerName: 'harbourmesh_community_hazards';
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: {
      south: number;
      west: number;
      north: number;
      east: number;
    };
  };
};

export type CommunityHazardArtifactManifest = {
  id: string;
  schemaVersion: 'harbourmesh.community-hazard-artifacts.v1';
  generatedAt: string;
  artifacts: CommunityHazardArtifact[];
  rules: {
    artifactsAreReferenceOnly: true;
    officialChartDataExcluded: true;
    rawRecordIdsExcluded: true;
    vesselIdsExcluded: true;
    sourceDeviceIdsExcluded: true;
    vectorTileGenerationPending: boolean;
  };
  sourceRecordCounts: {
    hazards: number;
    publicHazards: number;
    omittedPendingOrRejectedHazards: number;
    omittedUnpositionedHazards: number;
  };
};

export type FetchCommunityOverlayOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export type CommunityAggregateReleaseHistory = {
  releases: CommunityAggregateReleaseManifest[];
};

export type PublishCommunityAggregateReleaseInput = {
  generatedBy?: string;
  approval?: {
    approvedBy: string;
    approvedAt?: string;
    checklist: {
      referenceOnly: true;
      officialChartDataExcluded: true;
      rawRecordIdsExcluded: true;
      vesselIdsExcluded: true;
    };
    notes?: string;
  };
};

export type CommunityAggregateReleaseMutationOptions = FetchCommunityOverlayOptions & {
  apiKey?: string;
  accountAccessToken?: string;
  accountSessionStorage?: StorageLike | null;
};

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function isCommunityOverlay(value: unknown): value is CommunityGeoJsonOverlay {
  const overlay = value as Partial<CommunityGeoJsonOverlay>;
  return (
    overlay.type === 'FeatureCollection' &&
    overlay.metadata?.schemaVersion === 'harbourmesh.community-overlay.v1' &&
    overlay.metadata.officialChartDataIncluded === false &&
    overlay.metadata.communityProductsAreReferenceOnly === true &&
    overlay.metadata.rawRecordIdsIncluded === false &&
    overlay.metadata.vesselIdsIncluded === false &&
    overlay.metadata.sourceDeviceIdsIncluded === false &&
    Array.isArray(overlay.features) &&
    overlay.features.every((feature) => (
      feature.type === 'Feature' &&
      typeof feature.id === 'string' &&
      feature.geometry?.type === 'Point' &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length === 2 &&
      feature.properties?.officialChartDataIncluded === false &&
      feature.properties.rawRecordIdsIncluded === false &&
      feature.properties.vesselIdsIncluded === false &&
      feature.properties.sourceDeviceIdsIncluded === false &&
      !('id' in feature.properties) &&
      !('vesselId' in feature.properties) &&
      !('sourceDeviceId' in feature.properties)
    ))
  );
}

function isCommunityAggregate(value: unknown): value is CommunityAggregateGeoJson {
  const aggregate = value as Partial<CommunityAggregateGeoJson>;
  return (
    aggregate.type === 'FeatureCollection' &&
    aggregate.metadata?.schemaVersion === 'harbourmesh.community-aggregates.v1' &&
    aggregate.metadata.officialChartDataIncluded === false &&
    aggregate.metadata.communityProductsAreReferenceOnly === true &&
    aggregate.metadata.rawRecordIdsIncluded === false &&
    aggregate.metadata.vesselIdsIncluded === false &&
    Array.isArray(aggregate.features) &&
    aggregate.features.every((feature) => (
      feature.type === 'Feature' &&
      typeof feature.id === 'string' &&
      feature.geometry?.type === 'Polygon' &&
      Array.isArray(feature.geometry.coordinates?.[0]) &&
      feature.geometry.coordinates[0].length >= 4 &&
      feature.properties?.kind === 'aggregate_cell' &&
      typeof feature.properties.observationCount === 'number' &&
      typeof feature.properties.trackPointObservationCount === 'number' &&
      feature.properties.officialChartDataIncluded === false &&
      feature.properties.rawRecordIdsIncluded === false &&
      feature.properties.vesselIdsIncluded === false
    ))
  );
}

function isCommunityAggregateRelease(value: unknown): value is CommunityAggregateReleaseManifest {
  const release = value as Partial<CommunityAggregateReleaseManifest>;
  return (
    release.schemaVersion === 'harbourmesh.community-aggregate-release.v1' &&
    release.region === 'NB_PILOT' &&
    release.productKind === 'aggregate_geojson' &&
    release.rules?.communityProductsAreReferenceOnly === true &&
    release.rules.officialChartDataIncluded === false &&
    release.rules.rawRecordIdsIncluded === false &&
    release.rules.vesselIdsIncluded === false &&
    typeof release.product?.byteLength === 'number' &&
    /^[a-f0-9]{64}$/.test(release.product.sha256 ?? '')
  );
}

function isCommunityAggregateReleaseHistory(value: unknown): value is CommunityAggregateReleaseHistory {
  const history = value as Partial<CommunityAggregateReleaseHistory>;
  return Array.isArray(history.releases) && history.releases.every(isCommunityAggregateRelease);
}

function isPublishAggregateReleaseResponse(value: unknown): value is { ok: true; release: CommunityAggregateReleaseManifest } {
  const receipt = value as Partial<{ ok: true; release: CommunityAggregateReleaseManifest }>;
  return receipt.ok === true && isCommunityAggregateRelease(receipt.release);
}

function isCommunityAggregateReleaseArtifactManifest(value: unknown): value is CommunityAggregateReleaseArtifactManifest {
  const manifest = value as Partial<CommunityAggregateReleaseArtifactManifest>;
  return (
    manifest.schemaVersion === 'harbourmesh.community-aggregate-release-artifacts.v1' &&
    typeof manifest.releaseId === 'string' &&
    manifest.rules?.artifactsAreReferenceOnly === true &&
    manifest.rules.officialChartDataExcluded === true &&
    manifest.rules.rawRecordIdsExcluded === true &&
    manifest.rules.vesselIdsExcluded === true &&
    Array.isArray(manifest.artifacts) &&
    manifest.artifacts.every((artifact) => (
      typeof artifact.id === 'string' &&
      artifact.releaseId === manifest.releaseId &&
      typeof artifact.downloadPath === 'string' &&
      ['geojson', 'mbtiles', 'pmtiles'].includes(artifact.format ?? '') &&
      artifact.officialChartDataIncluded === false &&
      artifact.rawRecordIdsIncluded === false &&
      artifact.vesselIdsIncluded === false &&
      /^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')
    ))
  );
}

function isCommunityHazardArtifactManifest(value: unknown): value is CommunityHazardArtifactManifest {
  const manifest = value as Partial<CommunityHazardArtifactManifest>;
  return (
    manifest.schemaVersion === 'harbourmesh.community-hazard-artifacts.v1' &&
    manifest.rules?.artifactsAreReferenceOnly === true &&
    manifest.rules.officialChartDataExcluded === true &&
    manifest.rules.rawRecordIdsExcluded === true &&
    manifest.rules.vesselIdsExcluded === true &&
    manifest.rules.sourceDeviceIdsExcluded === true &&
    Array.isArray(manifest.artifacts) &&
    manifest.artifacts.every((artifact) => (
      typeof artifact.id === 'string' &&
      artifact.region === 'NB_PILOT' &&
      typeof artifact.downloadPath === 'string' &&
      ['geojson', 'mbtiles', 'pmtiles'].includes(artifact.format ?? '') &&
      artifact.officialChartDataIncluded === false &&
      artifact.rawRecordIdsIncluded === false &&
      artifact.vesselIdsIncluded === false &&
      artifact.sourceDeviceIdsIncluded === false &&
      /^[a-f0-9]{64}$/.test(artifact.sha256 ?? '')
    ))
  );
}

function buildJsonHeaders(
  credential?: string,
  accountAccessToken?: string,
  accountSessionStorage?: StorageLike | null
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(credential?.startsWith('hm_session_v1.')
      ? { Authorization: `Bearer ${credential}` }
      : credential
        ? { 'X-HarbourMesh-API-Key': credential }
        : {}),
    ...buildAccountSessionHeaders(accountAccessToken, accountSessionStorage),
  };
}

export function getCommunityOverlayFeaturesByKind(
  overlay: CommunityGeoJsonOverlay,
  kind: 'sounding' | 'hazard'
): CommunityOverlayFeature[] {
  return overlay.features.filter((feature) => feature.properties.kind === kind);
}

export async function fetchCommunityOverlay(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityGeoJsonOverlay> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/overlay.geojson', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/geo+json, application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community overlay request failed with HTTP ${response.status}`);
  }

  if (!isCommunityOverlay(body)) {
    throw new Error('Community overlay response was not a HarbourMesh reference overlay');
  }

  return body;
}

export async function fetchCommunityAggregates(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityAggregateGeoJson> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/aggregates.geojson', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/geo+json, application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate request failed with HTTP ${response.status}`);
  }

  if (!isCommunityAggregate(body)) {
    throw new Error('Community aggregate response was not a HarbourMesh aggregate overlay');
  }

  return body;
}

export async function fetchCommunityAggregateReleaseManifest(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityAggregateReleaseManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/releases/aggregates/latest', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate release request failed with HTTP ${response.status}`);
  }

  if (!isCommunityAggregateRelease(body)) {
    throw new Error('Community aggregate release response was not a HarbourMesh release manifest');
  }

  return body;
}

export async function fetchLatestCommunityAggregateReleaseCells(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityAggregateGeoJson> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/releases/aggregates/latest/cells.geojson', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/geo+json, application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate release cells request failed with HTTP ${response.status}`);
  }

  if (!isCommunityAggregate(body)) {
    throw new Error('Community aggregate release cells response was not a HarbourMesh aggregate overlay');
  }

  return body;
}

export async function fetchCommunityAggregateReleaseHistory(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityAggregateReleaseHistory> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/releases/aggregates', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate release history request failed with HTTP ${response.status}`);
  }

  if (!isCommunityAggregateReleaseHistory(body)) {
    throw new Error('Community aggregate release history response was not valid');
  }

  return body;
}

export async function fetchCommunityAggregateReleaseArtifacts(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityAggregateReleaseArtifactManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/releases/aggregates/latest/artifacts', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate release artifacts request failed with HTTP ${response.status}`);
  }

  if (!isCommunityAggregateReleaseArtifactManifest(body)) {
    throw new Error('Community aggregate release artifacts response was not valid');
  }

  return body;
}

export async function fetchCommunityHazardArtifacts(
  options: FetchCommunityOverlayOptions = {}
): Promise<CommunityHazardArtifactManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/hazards/artifacts', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community hazard artifacts request failed with HTTP ${response.status}`);
  }

  if (!isCommunityHazardArtifactManifest(body)) {
    throw new Error('Community hazard artifacts response was not valid');
  }

  return body;
}

export async function publishCommunityAggregateRelease(
  input: PublishCommunityAggregateReleaseInput = {},
  options: CommunityAggregateReleaseMutationOptions = {}
): Promise<CommunityAggregateReleaseManifest> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/community/releases/aggregates', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(
      resolvePilotReviewCredential(options.apiKey),
      options.accountAccessToken,
      options.accountSessionStorage
    ),
    body: JSON.stringify({
      ...(input.generatedBy?.trim() ? { generatedBy: input.generatedBy.trim() } : {}),
      ...(input.approval ? { approval: input.approval } : {}),
    }),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community aggregate release publish failed with HTTP ${response.status}`);
  }

  if (!isPublishAggregateReleaseResponse(body)) {
    throw new Error('Community aggregate release publish returned an invalid receipt');
  }

  return body.release;
}

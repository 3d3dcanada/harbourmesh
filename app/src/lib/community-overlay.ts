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

export type FetchCommunityOverlayOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
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
    Array.isArray(overlay.features) &&
    overlay.features.every((feature) => (
      feature.type === 'Feature' &&
      typeof feature.id === 'string' &&
      feature.geometry?.type === 'Point' &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length === 2
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
      feature.properties.officialChartDataIncluded === false &&
      feature.properties.rawRecordIdsIncluded === false &&
      feature.properties.vesselIdsIncluded === false
    ))
  );
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

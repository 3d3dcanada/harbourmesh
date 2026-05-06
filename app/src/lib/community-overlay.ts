export type CommunityOverlayFeature = {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number | boolean | null>;
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

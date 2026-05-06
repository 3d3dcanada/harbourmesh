import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { NBPilotChartCatalog, NBPilotChartSource } from './chart-catalog.js';

export type GeoNBFeatureFetchOptions = {
  source: NBPilotChartSource;
  packageId: string;
  bounds: NBPilotChartCatalog['bounds'];
  maxFeatures: number;
  fetchImpl?: typeof fetch;
};

export type GeoNBFeatureFetchResult = {
  sourceId: string;
  sourceLabel: string;
  fetchedFeatureCount: number;
  maxFeatures: number;
  truncated: boolean;
  collection: FeatureCollection;
};

function buildArcGisQueryUrl(source: NBPilotChartSource, bounds: NBPilotChartCatalog['bounds'], maxFeatures: number): string {
  const layerId = source.layer ?? '0';
  const url = new URL(`${source.sourceUrl.replace(/\/$/, '')}/${layerId}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('f', 'geojson');
  url.searchParams.set('geometry', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '4326');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('resultRecordCount', String(maxFeatures));
  return url.toString();
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
  const collection = value as Partial<FeatureCollection>;
  return collection.type === 'FeatureCollection' && Array.isArray(collection.features);
}

function normalizeFeature(
  feature: Feature,
  source: NBPilotChartSource,
  packageId: string
): Feature<Geometry, GeoJsonProperties> {
  return {
    type: 'Feature',
    id: feature.id,
    geometry: feature.geometry,
    properties: {
      ...(feature.properties ?? {}),
      harbourmeshPackageId: packageId,
      harbourmeshSourceId: source.id,
      harbourmeshSourceLabel: source.label,
      harbourmeshReferenceOnly: true,
      officialChartDataIncluded: false,
    },
  };
}

export async function fetchGeoNBSourceFeatures(options: GeoNBFeatureFetchOptions): Promise<GeoNBFeatureFetchResult> {
  if (!options.source.sharePolicy.mayCreateSharedTiles) {
    return {
      sourceId: options.source.id,
      sourceLabel: options.source.label,
      fetchedFeatureCount: 0,
      maxFeatures: options.maxFeatures,
      truncated: false,
      collection: {
        type: 'FeatureCollection',
        features: [],
      },
    };
  }

  if (options.source.kind !== 'wms' || !options.source.sourceUrl.includes('/MapServer')) {
    return {
      sourceId: options.source.id,
      sourceLabel: options.source.label,
      fetchedFeatureCount: 0,
      maxFeatures: options.maxFeatures,
      truncated: false,
      collection: {
        type: 'FeatureCollection',
        features: [],
      },
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(buildArcGisQueryUrl(options.source, options.bounds, options.maxFeatures), {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`GeoNB feature query failed for ${options.source.id} with HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isFeatureCollection(body)) {
    throw new Error(`GeoNB feature query for ${options.source.id} did not return GeoJSON`);
  }

  const features = body.features
    .filter((feature): feature is Feature => Boolean(feature?.geometry))
    .slice(0, options.maxFeatures)
    .map((feature) => normalizeFeature(feature, options.source, options.packageId));

  return {
    sourceId: options.source.id,
    sourceLabel: options.source.label,
    fetchedFeatureCount: features.length,
    maxFeatures: options.maxFeatures,
    truncated: body.features.length > features.length,
    collection: {
      type: 'FeatureCollection',
      features,
    },
  };
}

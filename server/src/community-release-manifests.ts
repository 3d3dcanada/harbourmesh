import { createHash } from 'node:crypto';
import type { CommunityAggregateGeoJson } from './community-aggregates.js';

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

function serializeAggregateGeoJson(aggregate: CommunityAggregateGeoJson): string {
  return JSON.stringify(aggregate);
}

export function buildCommunityAggregateReleaseManifest(
  aggregate: CommunityAggregateGeoJson
): CommunityAggregateReleaseManifest {
  const serialized = serializeAggregateGeoJson(aggregate);
  const generatedDate = aggregate.metadata.generatedAt.slice(0, 10);

  return {
    id: `community-aggregate-release:${aggregate.metadata.generatedAt}`,
    schemaVersion: 'harbourmesh.community-aggregate-release.v1',
    generatedAt: aggregate.metadata.generatedAt,
    region: 'NB_PILOT',
    productKind: 'aggregate_geojson',
    product: {
      fileName: `community-aggregates-${generatedDate}.geojson`,
      mediaType: 'application/geo+json',
      byteLength: Buffer.byteLength(serialized),
      sha256: createHash('sha256').update(serialized).digest('hex'),
      sourceRecordCounts: aggregate.metadata.sourceRecordCounts,
      aggregateCells: aggregate.features.length,
    },
    rules: {
      intendedUse: 'community_reference_overlay',
      communityProductsAreReferenceOnly: true,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
    },
  };
}

import type { StoredCommunityHazard } from './community-hazard-repository.js';
import type { StoredCommunitySounding } from './community-sounding-repository.js';

type PointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type CommunityFeature = {
  type: 'Feature';
  id: string;
  geometry: PointGeometry;
  properties: Record<string, string | number | boolean | null>;
};

export type CommunityGeoJsonOverlay = {
  type: 'FeatureCollection';
  features: CommunityFeature[];
  metadata: {
    schemaVersion: 'harbourmesh.community-overlay.v1';
    generatedAt: string;
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    communityProductsAreReferenceOnly: true;
    sourceRecordCounts: {
      soundings: number;
      hazards: number;
      publicHazards: number;
      pendingReviewHazards: number;
      rejectedHazards: number;
      omittedUnpositionedHazards: number;
    };
  };
};

function toSoundingFeature(sounding: StoredCommunitySounding): CommunityFeature {
  return {
    type: 'Feature',
    id: `sounding:${sounding.id}`,
    geometry: {
      type: 'Point',
      coordinates: [sounding.longitude, sounding.latitude],
    },
    properties: {
      kind: 'sounding',
      id: sounding.id,
      vesselId: sounding.vesselId,
      sourceDeviceId: sounding.sourceDeviceId,
      region: sounding.region,
      depthMeters: sounding.depthMeters,
      depthReference: sounding.depthReference,
      confidence: sounding.quality.confidence,
      rejected: sounding.quality.rejected,
      timestamp: sounding.timestamp,
      storedAt: sounding.storedAt,
      sharingState: sounding.sharingState,
      tideCorrectionApplied: sounding.tideCorrectionApplied,
      waterLevelCorrectionApplied: sounding.waterLevelCorrectionApplied,
      officialChartDataIncluded: false,
    },
  };
}

function toHazardFeature(hazard: StoredCommunityHazard): CommunityFeature | null {
  if (!hazard.position) return null;

  return {
    type: 'Feature',
    id: `hazard:${hazard.id}`,
    geometry: {
      type: 'Point',
      coordinates: [hazard.position.longitude, hazard.position.latitude],
    },
    properties: {
      kind: 'hazard',
      id: hazard.id,
      vesselId: hazard.vesselId,
      sourceDeviceId: hazard.sourceDeviceId ?? null,
      region: hazard.region,
      hazardType: hazard.type,
      severity: hazard.severity,
      description: hazard.description,
      reportedAt: hazard.reportedAt,
      storedAt: hazard.storedAt,
      sharingState: hazard.sharingState,
      reviewStatus: hazard.reviewStatus,
      reviewedAt: hazard.reviewedAt ?? null,
      positionAccuracyMeters: hazard.position.accuracy ?? null,
      officialChartDataIncluded: false,
    },
  };
}

export function buildCommunityGeoJsonOverlay(
  soundings: StoredCommunitySounding[],
  hazards: StoredCommunityHazard[],
  generatedAt = new Date().toISOString()
): CommunityGeoJsonOverlay {
  const soundingFeatures = soundings
    .filter((sounding) => !sounding.quality.rejected)
    .map(toSoundingFeature);
  const hazardFeatures = hazards.flatMap((hazard) => {
    if (!hazard.publicOverlayEligible) return [];
    const feature = toHazardFeature(hazard);
    return feature ? [feature] : [];
  });
  const pendingReviewHazards = hazards.filter((hazard) => hazard.reviewStatus === 'pending').length;
  const rejectedHazards = hazards.filter((hazard) => hazard.reviewStatus === 'rejected').length;
  const acceptedHazards = hazards.filter((hazard) => hazard.reviewStatus === 'accepted').length;
  const omittedUnpositionedHazards = acceptedHazards - hazardFeatures.length;

  return {
    type: 'FeatureCollection',
    features: [...soundingFeatures, ...hazardFeatures],
    metadata: {
      schemaVersion: 'harbourmesh.community-overlay.v1',
      generatedAt,
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      communityProductsAreReferenceOnly: true,
      sourceRecordCounts: {
        soundings: soundings.length,
        hazards: hazards.length,
        publicHazards: hazardFeatures.length,
        pendingReviewHazards,
        rejectedHazards,
        omittedUnpositionedHazards,
      },
    },
  };
}

import type { CommunityHazard } from '@/store';
import type { RawDepthSounding } from './community-soundings';
import type { CommunityOverlayFeature } from './community-overlay';

function soundingToFeature(sounding: RawDepthSounding): CommunityOverlayFeature | null {
  if (sounding.quality.rejected) return null;

  return {
    type: 'Feature',
    id: `local-sounding:${sounding.id}`,
    geometry: {
      type: 'Point',
      coordinates: [sounding.position.longitude, sounding.position.latitude],
    },
    properties: {
      kind: 'sounding',
      id: sounding.id,
      vesselId: sounding.vesselId,
      sourceDeviceId: sounding.sourceDeviceId,
      depthMeters: sounding.depthMeters,
      depthReference: sounding.depthReference,
      confidence: sounding.quality.confidence,
      timestamp: sounding.timestamp,
      sharingState: sounding.sharing.state,
      officialChartDataIncluded: false,
    },
  };
}

function hazardToFeature(hazard: CommunityHazard): CommunityOverlayFeature | null {
  if (!hazard.position) return null;

  return {
    type: 'Feature',
    id: `local-hazard:${hazard.id}`,
    geometry: {
      type: 'Point',
      coordinates: [hazard.position.longitude, hazard.position.latitude],
    },
    properties: {
      kind: 'hazard',
      id: hazard.id,
      vesselId: hazard.vesselId,
      sourceDeviceId: hazard.sourceDeviceId ?? null,
      hazardType: hazard.type,
      severity: hazard.severity,
      description: hazard.description,
      reportedAt: hazard.reportedAt,
      status: hazard.status,
      officialChartDataIncluded: false,
    },
  };
}

export function buildLocalCommunityOverlayFeatures(
  soundings: RawDepthSounding[],
  hazards: CommunityHazard[]
): CommunityOverlayFeature[] {
  return [
    ...soundings.flatMap((sounding) => {
      const feature = soundingToFeature(sounding);
      return feature ? [feature] : [];
    }),
    ...hazards.flatMap((hazard) => {
      const feature = hazardToFeature(hazard);
      return feature ? [feature] : [];
    }),
  ];
}

import { describe, expect, it } from 'vitest';
import type { CommunityHazard } from '@/store';
import { SharePositionLevel } from '@/types';
import type { RawDepthSounding } from './community-soundings';
import { buildLocalCommunityOverlayFeatures } from './local-community-overlay';

const sounding: RawDepthSounding = {
  id: 'sounding-1',
  vesselId: 'vessel-1',
  sourceDeviceId: 'signalk',
  sourceProtocol: 'signalk',
  rawMessageId: 'env-1',
  timestamp: '2026-05-06T12:00:00.000Z',
  receivedAt: '2026-05-06T12:00:01.000Z',
  position: { latitude: 45.27, longitude: -66.06 },
  rawDepthMeters: 12,
  depthMeters: 12.5,
  depthReference: 'below_transducer',
  tideCorrectionApplied: false,
  waterLevelCorrectionApplied: false,
  offsets: { surfaceToTransducerMeters: 0.5 },
  consent: {
    shareTelemetryForCommunity: true,
    shareLivePosition: SharePositionLevel.BLURRED,
    telemetryAnonymization: 'full',
    capturedAt: '2026-05-06T12:00:00.000Z',
  },
  sharing: {
    state: 'shareable_blurred',
    uploadLatitude: 45.27,
    uploadLongitude: -66.06,
  },
  quality: {
    confidence: 0.9,
    rejected: false,
    flags: [],
  },
};

const hazard: CommunityHazard = {
  id: 'hazard-1',
  vesselId: 'vessel-1',
  sourceDeviceId: 'boat-node-001',
  type: 'debris',
  severity: 'medium',
  description: 'Floating debris near track',
  position: {
    latitude: 45.28,
    longitude: -66.07,
    source: 'gps',
    timestamp: '2026-05-06T12:05:00.000Z',
  },
  reportedAt: '2026-05-06T12:05:00.000Z',
  status: 'queued',
};

describe('local community overlay features', () => {
  it('turns accepted soundings and positioned hazards into map features', () => {
    const features = buildLocalCommunityOverlayFeatures([sounding], [hazard]);

    expect(features).toEqual([
      expect.objectContaining({
        id: 'local-sounding:sounding-1',
        geometry: {
          type: 'Point',
          coordinates: [-66.06, 45.27],
        },
        properties: expect.objectContaining({
          kind: 'sounding',
          depthMeters: 12.5,
          officialChartDataIncluded: false,
        }),
      }),
      expect.objectContaining({
        id: 'local-hazard:hazard-1',
        geometry: {
          type: 'Point',
          coordinates: [-66.07, 45.28],
        },
        properties: expect.objectContaining({
          kind: 'hazard',
          severity: 'medium',
          status: 'queued',
        }),
      }),
    ]);
  });

  it('omits rejected soundings and unpositioned hazards', () => {
    const features = buildLocalCommunityOverlayFeatures(
      [{ ...sounding, id: 'rejected', quality: { ...sounding.quality, rejected: true } }],
      [{ ...hazard, id: 'no-position', position: undefined }]
    );

    expect(features).toHaveLength(0);
  });
});

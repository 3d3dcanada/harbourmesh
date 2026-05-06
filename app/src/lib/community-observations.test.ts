import { describe, expect, it } from 'vitest';
import { SharePositionLevel, TelemetryMessageType, type ConsentSettings, type TelemetryMessage } from '@/types';
import {
  buildCommunityObservationUploadBatch,
  createCommunityObservationsFromTelemetry,
} from './community-observations';

const consent: ConsentSettings = {
  vesselId: 'vessel-1',
  userId: 'user-1',
  shareLivePosition: SharePositionLevel.BLURRED,
  shareTelemetryForCommunity: true,
  shareTelemetryForTraining: false,
  telemetryAnonymization: 'full',
  shareLogsForTraining: false,
  logAnonymization: 'full',
  enterpriseLockdownMode: false,
  fleetOnlySharing: false,
  allowAICloudProcessing: false,
  allowAITrainingUse: false,
  lastUpdated: '2026-05-06T12:00:00.000Z',
  updatedBy: 'user-1',
};

const messages: TelemetryMessage[] = [
  {
    id: 'pos-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'signalk',
    timestamp: '2026-05-06T12:00:00.000Z',
    messageType: TelemetryMessageType.POSITION,
    payload: {
      latitude: 45.27331,
      longitude: -66.06334,
      accuracy: 8,
      cog: 72,
      sog: 7.5,
      fixType: '3d',
      satellites: 10,
    },
  },
  {
    id: 'env-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'signalk',
    timestamp: '2026-05-06T12:00:02.000Z',
    messageType: TelemetryMessageType.ENVIRONMENT,
    payload: {
      waterTemperature: 11.5,
      windSpeed: 13.2,
      windDirection: 210,
      barometricPressure: 1012.8,
    },
  },
  {
    id: 'ais-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'ais-rx',
    timestamp: '2026-05-06T12:00:03.000Z',
    messageType: TelemetryMessageType.AIS,
    payload: {
      mmsi: '316001234',
      name: 'Passing Vessel',
      vesselType: 'pleasure',
      position: {
        latitude: 45.27491,
        longitude: -66.06491,
      },
      cog: 70,
      sog: 8.1,
      heading: 68,
      timestamp: '2026-05-06T12:00:03.000Z',
    },
  },
];

describe('community observations', () => {
  it('creates consent-safe telemetry observations without raw payloads or official chart data', () => {
    const observations = createCommunityObservationsFromTelemetry(messages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      receivedAt: '2026-05-06T12:00:04.000Z',
    });

    expect(observations).toHaveLength(3);
    expect(observations[0]).toMatchObject({
      id: 'pos-1:observation',
      observationType: 'track_point',
      sharingState: 'shareable_blurred',
      position: {
        latitude: 45.27,
        longitude: -66.06,
        accuracy: 1000,
      },
      rawPayloadIncluded: false,
      officialChartDataIncluded: false,
      quality: {
        rejected: false,
      },
    });
    expect(observations[1]).toMatchObject({
      observationType: 'condition',
      position: {
        latitude: 45.27,
        longitude: -66.06,
      },
      metrics: {
        waterTemperatureC: 11.5,
        windSpeedKnots: 13.2,
        pressureHPa: 1012.8,
      },
    });
    expect(observations[2]).toMatchObject({
      observationType: 'ais_target',
      metrics: {
        targetType: 'pleasure',
        hasName: true,
        sogKnots: 8.1,
      },
    });
    expect(JSON.stringify(observations[2].metrics)).not.toContain('316001234');
  });

  it('omits positions when community position sharing is disabled', () => {
    const [observation] = createCommunityObservationsFromTelemetry(messages, {
      ...consent,
      shareLivePosition: SharePositionLevel.NONE,
    }, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
    });

    expect(observation.sharingState).toBe('shareable_no_position');
    expect(observation.position).toBeUndefined();
  });

  it('builds upload batches with raw sensor payload exclusion policy', () => {
    const observations = createCommunityObservationsFromTelemetry(messages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      receivedAt: '2026-05-06T12:00:04.000Z',
    });

    const batch = buildCommunityObservationUploadBatch(observations, {
      batchId: 'observation-batch-1',
      createdAt: '2026-05-06T12:01:00.000Z',
      uploadEndpoint: '/api/community/observations',
    });

    expect(batch).toMatchObject({
      id: 'observation-batch-1',
      schemaVersion: 'harbourmesh.community-observations.v1',
      recordCount: 3,
      policy: {
        intendedUse: 'community_reference_overlay',
        officialChartDataIncluded: false,
        rawLocalPositionsIncluded: false,
        rawSensorPayloadsIncluded: false,
        uploadEndpoint: '/api/community/observations',
      },
    });
  });
});

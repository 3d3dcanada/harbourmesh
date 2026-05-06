import { describe, expect, it } from 'vitest';
import { SharePositionLevel, TelemetryMessageType, type ConsentSettings, type TelemetryMessage } from '@/types';
import {
  buildCommunitySoundingUploadBatch,
  createSoundingsFromTelemetry,
  prepareSoundingForCommunityUpload,
} from './community-soundings';

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
    },
  },
  {
    id: 'env-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'signalk',
    timestamp: '2026-05-06T12:00:02.000Z',
    messageType: TelemetryMessageType.ENVIRONMENT,
    payload: {
      depthBelowTransducer: 12.4,
      waterTemperature: 11.5,
    },
  },
];

describe('community soundings', () => {
  it('creates local raw sounding records from telemetry with offsets and consent snapshot', () => {
    const [sounding] = createSoundingsFromTelemetry(messages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      offsets: { surfaceToTransducerMeters: 0.6 },
      receivedAt: '2026-05-06T12:00:03.000Z',
    });

    expect(sounding).toMatchObject({
      id: 'env-1:sounding',
      rawDepthMeters: 12.4,
      depthMeters: 13,
      depthReference: 'below_transducer',
      tideCorrectionApplied: false,
      waterLevelCorrectionApplied: false,
      consent: {
        shareTelemetryForCommunity: true,
        shareLivePosition: SharePositionLevel.BLURRED,
      },
      sharing: {
        state: 'shareable_blurred',
        uploadLatitude: 45.27,
        uploadLongitude: -66.06,
      },
    });
    expect(sounding.quality.rejected).toBe(false);
  });

  it('flags and rejects abrupt depth spikes before upload', () => {
    const spikeMessages: TelemetryMessage[] = [
      messages[0],
      messages[1],
      {
        id: 'env-spike',
        vesselId: 'vessel-1',
        sourceDeviceId: 'signalk',
        timestamp: '2026-05-06T12:00:06.000Z',
        messageType: TelemetryMessageType.ENVIRONMENT,
        payload: {
          depthBelowTransducer: 80,
          waterTemperature: 11.4,
        },
      },
    ];

    const [, spike] = createSoundingsFromTelemetry(spikeMessages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      offsets: { surfaceToTransducerMeters: 0.6 },
      maxDepthJumpMeters: 20,
    });

    expect(spike.quality.flags).toContain('abrupt_depth_jump');
    expect(spike.quality.rejected).toBe(true);
    expect(prepareSoundingForCommunityUpload(spike)).toBeNull();
  });

  it('does not flag legitimate slower depth changes outside the jump window', () => {
    const slowerChangeMessages: TelemetryMessage[] = [
      messages[0],
      messages[1],
      {
        id: 'pos-2',
        vesselId: 'vessel-1',
        sourceDeviceId: 'signalk',
        timestamp: '2026-05-06T12:00:30.000Z',
        messageType: TelemetryMessageType.POSITION,
        payload: {
          latitude: 45.274,
          longitude: -66.064,
          accuracy: 9,
          cog: 74,
          sog: 7.2,
          fixType: '3d',
        },
      },
      {
        id: 'env-slower-change',
        vesselId: 'vessel-1',
        sourceDeviceId: 'signalk',
        timestamp: '2026-05-06T12:00:32.000Z',
        messageType: TelemetryMessageType.ENVIRONMENT,
        payload: {
          depthBelowTransducer: 45,
          waterTemperature: 11.2,
        },
      },
    ];

    const [, slowerChange] = createSoundingsFromTelemetry(slowerChangeMessages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      offsets: { surfaceToTransducerMeters: 0.6 },
      maxDepthJumpMeters: 20,
    });

    expect(slowerChange.quality.flags).not.toContain('abrupt_depth_jump');
    expect(slowerChange.quality.rejected).toBe(false);
  });

  it('keeps records local-only when telemetry community sharing is disabled', () => {
    const [sounding] = createSoundingsFromTelemetry(messages, {
      ...consent,
      shareTelemetryForCommunity: false,
    }, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
    });

    expect(sounding.sharing.state).toBe('local_only');
    expect(prepareSoundingForCommunityUpload(sounding)).toBeNull();
  });

  it('exports only the consent-safe upload position', () => {
    const [sounding] = createSoundingsFromTelemetry(messages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      offsets: { surfaceToTransducerMeters: 0.6 },
    });

    expect(prepareSoundingForCommunityUpload(sounding)).toMatchObject({
      latitude: 45.27,
      longitude: -66.06,
      depthMeters: 13,
      sourceProtocol: 'signalk',
    });
  });

  it('builds upload batches with provenance and chart-data guardrails', () => {
    const [sounding] = createSoundingsFromTelemetry(messages, consent, {
      vesselId: 'vessel-1',
      sourceProtocol: 'signalk',
      offsets: { surfaceToTransducerMeters: 0.6 },
      receivedAt: '2026-05-06T12:00:03.000Z',
    });

    const batch = buildCommunitySoundingUploadBatch([sounding], {
      batchId: 'batch-1',
      createdAt: '2026-05-06T12:01:00.000Z',
      uploadEndpoint: '/api/community/soundings',
    });

    expect(batch).toMatchObject({
      id: 'batch-1',
      schemaVersion: 'harbourmesh.community-soundings.v1',
      region: 'NB_PILOT',
      recordCount: 1,
      policy: {
        intendedUse: 'community_reference_overlay',
        officialChartDataIncluded: false,
        rawLocalPositionsIncluded: false,
        uploadEndpoint: '/api/community/soundings',
      },
    });
    expect(batch?.records[0]).toMatchObject({
      id: 'env-1:sounding',
      sourceDeviceId: 'signalk',
      rawMessageId: 'env-1',
      sharingState: 'shareable_blurred',
      consentCapturedAt: consent.lastUpdated,
    });
  });
});

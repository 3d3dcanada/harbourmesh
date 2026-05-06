import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { CommunitySoundingBatch } from './community-soundings.js';

const sampleBatch: CommunitySoundingBatch = {
  id: 'batch-1',
  schemaVersion: 'harbourmesh.community-soundings.v1',
  createdAt: '2026-05-06T12:00:00.000Z',
  region: 'NB_PILOT',
  recordCount: 1,
  records: [
    {
      id: 'sounding-1',
      vesselId: 'vessel-1',
      timestamp: '2026-05-06T12:00:00.000Z',
      latitude: 45.27,
      longitude: -66.06,
      sourceDeviceId: 'signalk',
      sourceProtocol: 'signalk',
      rawMessageId: 'env-1',
      receivedAt: '2026-05-06T12:00:01.000Z',
      sharingState: 'shareable_blurred',
      consentCapturedAt: '2026-05-06T11:59:00.000Z',
      rawDepthMeters: 12,
      depthMeters: 12.5,
      depthReference: 'below_transducer',
      tideCorrectionApplied: false,
      waterLevelCorrectionApplied: false,
      offsets: { surfaceToTransducerMeters: 0.5 },
      quality: { confidence: 0.9, rejected: false, flags: [] },
    },
  ],
  policy: {
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    containsFullSharedPositions: false,
    rawLocalPositionsIncluded: false,
    uploadEndpoint: '/api/community/soundings',
  },
};

const sampleDeviceRegistration = {
  deviceId: 'boat-node-001',
  vesselId: 'vessel-1',
  displayName: 'NB Pilot Boat Node',
  kind: 'boat_node',
  softwareVersion: '0.1.0',
  signalKBaseUrl: 'http://boat-node.local:3000',
  registeredAt: '2026-05-06T12:00:00.000Z',
  consentCapturedAt: '2026-05-06T11:59:00.000Z',
  capabilities: {
    position: true,
    depth: true,
    ais: true,
    radar: false,
    sonar: true,
    weather: false,
  },
};

async function createTestApp() {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  const dataDir = await mkdtemp(join(testRoot, 'harbourmesh-server-test-'));
  return buildApp({ dataDir });
}

describe('HarbourMesh API', () => {
  it('accepts valid community sounding batches', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      payload: sampleBatch,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      ok: true,
      batchId: 'batch-1',
      acceptedCount: 1,
      duplicateCount: 0,
    });
  });

  it('rejects batches that include official chart data', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      payload: {
        ...sampleBatch,
        policy: {
          ...sampleBatch.policy,
          officialChartDataIncluded: true,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'invalid_community_sounding_batch',
    });
  });

  it('summarizes accepted community soundings', async () => {
    const app = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      payload: sampleBatch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/community/soundings/summary',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalRecords: 1,
      batchCount: 1,
      regions: {
        NB_PILOT: 1,
      },
      latestTimestamp: '2026-05-06T12:00:00.000Z',
    });
  });

  it('registers and lists Boat Node devices', async () => {
    const app = await createTestApp();
    const registration = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      payload: sampleDeviceRegistration,
    });

    expect(registration.statusCode).toBe(202);
    expect(registration.json()).toMatchObject({
      ok: true,
      deviceId: 'boat-node-001',
      status: 'registered',
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/devices',
    });

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      devices: [
        {
          deviceId: 'boat-node-001',
          capabilities: {
            depth: true,
            sonar: true,
          },
        },
      ],
    });
  });

  it('rejects invalid device registration payloads', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      payload: {
        ...sampleDeviceRegistration,
        capabilities: {
          position: true,
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'invalid_device_registration',
    });
  });
});

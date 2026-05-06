import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp, type BuildAppOptions } from './app.js';
import type { CommunityHazardBatch } from './community-hazards.js';
import type { CommunitySoundingBatch } from './community-soundings.js';

const TEST_API_KEY = 'hm_test_api_key_1234567890';

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

const sampleHazardBatch: CommunityHazardBatch = {
  id: 'hazard-batch-1',
  schemaVersion: 'harbourmesh.community-hazards.v1',
  createdAt: '2026-05-06T12:05:00.000Z',
  region: 'NB_PILOT',
  recordCount: 1,
  hazards: [
    {
      id: 'hazard-1',
      vesselId: 'vessel-1',
      sourceDeviceId: 'boat-node-001',
      type: 'debris',
      severity: 'medium',
      description: 'Floating debris near track',
      position: {
        latitude: 45.27,
        longitude: -66.06,
        accuracy: 1000,
        source: 'gps',
        timestamp: '2026-05-06T12:04:00.000Z',
      },
      reportedAt: '2026-05-06T12:04:00.000Z',
      sharingState: 'shareable_blurred',
      consentCapturedAt: '2026-05-06T11:59:00.000Z',
    },
  ],
  policy: {
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    containsFullSharedPositions: false,
    rawLocalPositionsIncluded: false,
    uploadEndpoint: '/api/community/hazards',
  },
};

async function createTestApp(options: Partial<Omit<BuildAppOptions, 'dataDir'>> = {}) {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  const dataDir = await mkdtemp(join(testRoot, 'harbourmesh-server-test-'));
  return buildApp({ dataDir, ...options });
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

  it('requires a pilot API key for protected intake when auth is configured', async () => {
    const app = await createTestApp({
      apiKeys: [TEST_API_KEY],
      requireApiAuth: true,
    });

    const missingKey = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      payload: sampleBatch,
    });
    expect(missingKey.statusCode).toBe(401);
    expect(missingKey.json()).toMatchObject({
      ok: false,
      error: 'api_key_required',
    });

    const accepted = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      headers: {
        'x-harbourmesh-api-key': TEST_API_KEY,
      },
      payload: sampleBatch,
    });
    expect(accepted.statusCode).toBe(202);

    const publicSummary = await app.inject({
      method: 'GET',
      url: '/api/community/soundings/summary',
    });
    expect(publicSummary.statusCode).toBe(200);
  });

  it('fails closed when pilot API auth is required without configured keys', async () => {
    const app = await createTestApp({
      apiKeys: [],
      requireApiAuth: true,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      payload: sampleHazardBatch,
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'api_auth_not_configured',
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

  it('serves the NB pilot chart catalog with legal source policies', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/charts/nb/catalog',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'nb-pilot-chart-catalog',
      schemaVersion: 'harbourmesh.chart-catalog.v1',
      rules: {
        officialChartDataMustRemainLocal: true,
        communityProductsAreReferenceOnly: true,
      },
    });
    expect(response.json().sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'geonb-nbhn-watercourse',
          kind: 'wms',
          sharePolicy: expect.objectContaining({
            mayCreateSharedTiles: true,
          }),
        }),
        expect.objectContaining({
          id: 'chs-official-digital-products',
          kind: 'licence-boundary',
          sharePolicy: expect.objectContaining({
            mayUploadToCommunityMesh: false,
            requiresSeparateLicence: true,
          }),
        }),
      ])
    );
  });

  it('accepts and summarizes community hazard batches', async () => {
    const app = await createTestApp();
    const receipt = await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      payload: sampleHazardBatch,
    });

    expect(receipt.statusCode).toBe(202);
    expect(receipt.json()).toMatchObject({
      ok: true,
      batchId: 'hazard-batch-1',
      acceptedCount: 1,
      duplicateCount: 0,
    });

    const summary = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/summary',
    });

    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      totalRecords: 1,
      batchCount: 1,
      regions: {
        NB_PILOT: 1,
      },
      byType: {
        debris: 1,
      },
      bySeverity: {
        medium: 1,
      },
      latestReportedAt: '2026-05-06T12:04:00.000Z',
    });
  });

  it('publishes accepted community data as reference-only GeoJSON', async () => {
    const app = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      payload: sampleBatch,
    });
    await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      payload: sampleHazardBatch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/community/overlay.geojson',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        schemaVersion: 'harbourmesh.community-overlay.v1',
        intendedUse: 'community_reference_overlay',
        officialChartDataIncluded: false,
        communityProductsAreReferenceOnly: true,
        sourceRecordCounts: {
          soundings: 1,
          hazards: 1,
          omittedUnpositionedHazards: 0,
        },
      },
    });
    expect(response.json().features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sounding:sounding-1',
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
          id: 'hazard:hazard-1',
          properties: expect.objectContaining({
            kind: 'hazard',
            severity: 'medium',
            sharingState: 'shareable_blurred',
          }),
        }),
      ])
    );
  });

  it('rejects hazard batches that leak local-only positions', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      payload: {
        ...sampleHazardBatch,
        hazards: [
          {
            ...sampleHazardBatch.hazards[0],
            sharingState: 'shareable_no_position',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'invalid_community_hazard_batch',
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

  it('protects device registry reads when API auth is configured', async () => {
    const app = await createTestApp({
      apiKeys: [TEST_API_KEY],
      requireApiAuth: true,
    });

    await app.inject({
      method: 'POST',
      url: '/api/devices/register',
      headers: {
        'x-harbourmesh-api-key': TEST_API_KEY,
      },
      payload: sampleDeviceRegistration,
    });

    const missingKey = await app.inject({
      method: 'GET',
      url: '/api/devices',
    });
    expect(missingKey.statusCode).toBe(401);

    const list = await app.inject({
      method: 'GET',
      url: '/api/devices',
      headers: {
        authorization: `Bearer ${TEST_API_KEY}`,
      },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      devices: [
        {
          deviceId: 'boat-node-001',
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

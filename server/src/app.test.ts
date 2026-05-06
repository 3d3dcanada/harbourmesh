import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseOperatorApiKeys } from './api-auth.js';
import { buildApp, type BuildAppOptions } from './app.js';
import type { CommunityHazardBatch } from './community-hazards.js';
import type { CommunityObservationBatch } from './community-observations.js';
import type { CommunitySoundingBatch } from './community-soundings.js';

const TEST_API_KEY = 'hm_test_api_key_1234567890';
const TEST_WRITE_API_KEY = 'hm_test_write_key_1234567890';
const TEST_REVIEW_API_KEY = 'hm_test_review_key_1234567890';

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

const sampleObservationBatch: CommunityObservationBatch = {
  id: 'observation-batch-1',
  schemaVersion: 'harbourmesh.community-observations.v1',
  createdAt: '2026-05-06T12:06:00.000Z',
  region: 'NB_PILOT',
  recordCount: 2,
  observations: [
    {
      id: 'radar-contact-1',
      vesselId: 'vessel-1',
      sourceDeviceId: 'boat-node-001',
      sourceProtocol: 'signalk',
      observationType: 'radar_contact',
      observedAt: '2026-05-06T12:05:20.000Z',
      receivedAt: '2026-05-06T12:05:22.000Z',
      position: {
        latitude: 45.271,
        longitude: -66.059,
        accuracy: 150,
        source: 'radar',
        timestamp: '2026-05-06T12:05:20.000Z',
      },
      sharingState: 'shareable_blurred',
      consentCapturedAt: '2026-05-06T11:59:00.000Z',
      metrics: {
        rangeMeters: 420,
        bearingDegrees: 74,
        classification: 'unknown_contact',
      },
      quality: { confidence: 0.72, rejected: false, flags: ['unverified_contact'] },
      rawPayloadIncluded: false,
      officialChartDataIncluded: false,
    },
    {
      id: 'weather-1',
      vesselId: 'vessel-1',
      sourceDeviceId: 'boat-node-001',
      sourceProtocol: 'signalk',
      observationType: 'weather',
      observedAt: '2026-05-06T12:05:40.000Z',
      receivedAt: '2026-05-06T12:05:45.000Z',
      sharingState: 'shareable_no_position',
      consentCapturedAt: '2026-05-06T11:59:00.000Z',
      metrics: {
        windSpeedKnots: 13.4,
        windDirectionDegrees: 210,
        pressureHPa: 1012.8,
      },
      quality: { confidence: 0.84, rejected: false, flags: [] },
      rawPayloadIncluded: false,
      officialChartDataIncluded: false,
    },
  ],
  policy: {
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    containsFullSharedPositions: false,
    rawLocalPositionsIncluded: false,
    rawSensorPayloadsIncluded: false,
    uploadEndpoint: '/api/community/observations',
  },
};

async function createTestApp(options: Partial<Omit<BuildAppOptions, 'dataDir'>> = {}) {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  const dataDir = await mkdtemp(join(testRoot, 'harbourmesh-server-test-'));
  return buildApp({ dataDir, ...options });
}

describe('HarbourMesh API', () => {
  it('parses review operator API keys from environment-style config', () => {
    expect(parseOperatorApiKeys(`nb-ops:${TEST_REVIEW_API_KEY}, broken, second: second-key `)).toEqual([
      {
        key: TEST_REVIEW_API_KEY,
        operatorId: 'nb-ops',
      },
      {
        key: 'second-key',
        operatorId: 'second',
      },
    ]);
  });

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

  it('separates write and review scoped pilot API keys', async () => {
    const app = await createTestApp({
      writeApiKeys: [TEST_WRITE_API_KEY],
      reviewOperatorKeys: [{ key: TEST_REVIEW_API_KEY, operatorId: 'nb-ops-reviewer' }],
      requireApiAuth: true,
    });

    const reviewOnlyUpload = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      headers: {
        'x-harbourmesh-api-key': TEST_REVIEW_API_KEY,
      },
      payload: sampleBatch,
    });
    expect(reviewOnlyUpload.statusCode).toBe(403);
    expect(reviewOnlyUpload.json()).toMatchObject({
      ok: false,
      error: 'api_key_scope_required',
      requiredScope: 'write',
    });

    const writeUpload = await app.inject({
      method: 'POST',
      url: '/api/community/soundings',
      headers: {
        'x-harbourmesh-api-key': TEST_WRITE_API_KEY,
      },
      payload: sampleBatch,
    });
    expect(writeUpload.statusCode).toBe(202);

    const reviewOnlyObservationUpload = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      headers: {
        'x-harbourmesh-api-key': TEST_REVIEW_API_KEY,
      },
      payload: sampleObservationBatch,
    });
    expect(reviewOnlyObservationUpload.statusCode).toBe(403);

    const writeObservationUpload = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      headers: {
        'x-harbourmesh-api-key': TEST_WRITE_API_KEY,
      },
      payload: sampleObservationBatch,
    });
    expect(writeObservationUpload.statusCode).toBe(202);

    await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      headers: {
        'x-harbourmesh-api-key': TEST_WRITE_API_KEY,
      },
      payload: sampleHazardBatch,
    });

    const writeReviewQueue = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/review',
      headers: {
        'x-harbourmesh-api-key': TEST_WRITE_API_KEY,
      },
    });
    expect(writeReviewQueue.statusCode).toBe(403);
    expect(writeReviewQueue.json()).toMatchObject({
      ok: false,
      error: 'api_key_scope_required',
      requiredScope: 'review',
    });

    const writeReviewHistory = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/reviews',
      headers: {
        'x-harbourmesh-api-key': TEST_WRITE_API_KEY,
      },
    });
    expect(writeReviewHistory.statusCode).toBe(403);

    const reviewQueue = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/review',
      headers: {
        authorization: `Bearer ${TEST_REVIEW_API_KEY}`,
      },
    });
    expect(reviewQueue.statusCode).toBe(200);
    expect(reviewQueue.json()).toMatchObject({
      hazards: [
        {
          id: 'hazard-1',
          reviewStatus: 'pending',
        },
      ],
    });

    const reviewDecision = await app.inject({
      method: 'POST',
      url: '/api/community/hazards/hazard-1/review',
      headers: {
        'x-harbourmesh-api-key': TEST_REVIEW_API_KEY,
      },
      payload: {
        status: 'accepted',
        reviewedBy: 'client-supplied-reviewer',
      },
    });
    expect(reviewDecision.statusCode).toBe(202);

    const reviewHistory = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/reviews',
      headers: {
        'x-harbourmesh-api-key': TEST_REVIEW_API_KEY,
      },
    });
    expect(reviewHistory.statusCode).toBe(200);
    expect(reviewHistory.json()).toMatchObject({
      reviews: [
        {
          hazardId: 'hazard-1',
          status: 'accepted',
          reviewedBy: 'nb-ops-reviewer',
        },
      ],
    });
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

  it('accepts and summarizes governed community observation batches', async () => {
    const app = await createTestApp();
    const receipt = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      payload: sampleObservationBatch,
    });

    expect(receipt.statusCode).toBe(202);
    expect(receipt.json()).toMatchObject({
      ok: true,
      batchId: 'observation-batch-1',
      acceptedCount: 2,
      duplicateCount: 0,
    });

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      payload: sampleObservationBatch,
    });
    expect(duplicate.statusCode).toBe(202);
    expect(duplicate.json()).toMatchObject({
      acceptedCount: 0,
      duplicateCount: 2,
    });

    const summary = await app.inject({
      method: 'GET',
      url: '/api/community/observations/summary',
    });

    expect(summary.statusCode).toBe(200);
    expect(summary.json()).toMatchObject({
      totalRecords: 2,
      batchCount: 2,
      regions: {
        NB_PILOT: 2,
      },
      byType: {
        radar_contact: 1,
        weather: 1,
      },
      positionedRecords: 1,
      latestObservedAt: '2026-05-06T12:05:40.000Z',
    });
  });

  it('rejects community observations that leak raw payloads or position policy', async () => {
    const app = await createTestApp();
    const rawPayloadResponse = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      payload: {
        ...sampleObservationBatch,
        observations: [
          {
            ...sampleObservationBatch.observations[0],
            rawPayloadIncluded: true,
          },
        ],
      },
    });

    expect(rawPayloadResponse.statusCode).toBe(400);
    expect(rawPayloadResponse.json()).toMatchObject({
      ok: false,
      error: 'invalid_community_observation_batch',
    });

    const positionPolicyResponse = await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      payload: {
        ...sampleObservationBatch,
        recordCount: 1,
        observations: [
          {
            ...sampleObservationBatch.observations[0],
            sharingState: 'shareable_no_position',
          },
        ],
      },
    });

    expect(positionPolicyResponse.statusCode).toBe(400);
    expect(positionPolicyResponse.json()).toMatchObject({
      ok: false,
      error: 'invalid_community_observation_batch',
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

  it('serves NB offline chart package manifests without official chart data', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/charts/nb/packages',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'nb-pilot-chart-packages',
      schemaVersion: 'harbourmesh.chart-packages.v1',
      rules: {
        packagesAreReferenceOnly: true,
        officialChartDataExcluded: true,
        requiresRegenerationBeforeOfflineUse: true,
      },
    });
    expect(response.json().packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'nb-coast-reference',
          intendedUse: 'reference_only',
          officialChartDataIncluded: false,
          excludedSourceIds: expect.arrayContaining(['chs-official-digital-products']),
          formats: expect.arrayContaining(['pmtiles', 'mbtiles', 'geojson']),
        }),
        expect.objectContaining({
          id: 'nb-inland-waterways-reference',
          sourceIds: expect.arrayContaining(['geonb-lake-depth-bathymetry-points']),
        }),
      ])
    );
  });

  it('serves generated NB reference package artifacts without official chart data', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/charts/nb/package-artifacts',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 'nb-pilot-chart-package-artifacts',
      schemaVersion: 'harbourmesh.chart-package-artifacts.v1',
      rules: {
        artifactsAreReferenceOnly: true,
        officialChartDataExcluded: true,
        pmtilesGenerationPending: true,
        mbtilesGenerationPending: true,
      },
    });
    expect(response.json().artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageId: 'nb-coast-reference',
          format: 'geojson',
          mediaType: 'application/geo+json',
          officialChartDataIncluded: false,
          excludedSourceIds: expect.arrayContaining(['chs-official-digital-products']),
          byteLength: expect.any(Number),
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          content: expect.objectContaining({
            type: 'FeatureCollection',
            metadata: expect.objectContaining({
              officialChartDataIncluded: false,
            }),
          }),
        }),
      ])
    );
    const artifactBody = JSON.stringify(response.json());
    expect(artifactBody).not.toContain('"officialChartDataIncluded":true');
    expect(response.json().artifacts[0].sourceIds).not.toContain('chs-official-digital-products');
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
      byReviewStatus: {
        pending: 1,
        accepted: 0,
        rejected: 0,
      },
      publicOverlayEligible: 0,
      pendingReviewCount: 1,
      latestReportedAt: '2026-05-06T12:04:00.000Z',
    });
  });

  it('keeps pending hazards out of public GeoJSON until review accepts them', async () => {
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

    const pendingOverlay = await app.inject({
      method: 'GET',
      url: '/api/community/overlay.geojson',
    });

    expect(pendingOverlay.statusCode).toBe(200);
    expect(pendingOverlay.json()).toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        schemaVersion: 'harbourmesh.community-overlay.v1',
        intendedUse: 'community_reference_overlay',
        officialChartDataIncluded: false,
        communityProductsAreReferenceOnly: true,
        sourceRecordCounts: {
          soundings: 1,
          hazards: 1,
          publicHazards: 0,
          pendingReviewHazards: 1,
          rejectedHazards: 0,
          omittedUnpositionedHazards: 0,
        },
      },
    });
    expect(pendingOverlay.json().features).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: 'hazard:hazard-1',
        }),
      ])
    );

    const review = await app.inject({
      method: 'POST',
      url: '/api/community/hazards/hazard-1/review',
      payload: {
        status: 'accepted',
        reviewedBy: 'nb-pilot-reviewer',
        reviewedAt: '2026-05-06T12:10:00.000Z',
        note: 'Visible debris report with blurred position is suitable for reference overlay.',
      },
    });

    expect(review.statusCode).toBe(202);
    expect(review.json()).toMatchObject({
      ok: true,
      hazardId: 'hazard-1',
      status: 'accepted',
      publicOverlayEligible: true,
      reviewedAt: '2026-05-06T12:10:00.000Z',
    });

    const acceptedOverlay = await app.inject({
      method: 'GET',
      url: '/api/community/overlay.geojson',
    });

    expect(acceptedOverlay.statusCode).toBe(200);
    expect(acceptedOverlay.json()).toMatchObject({
      metadata: {
        sourceRecordCounts: {
          soundings: 1,
          hazards: 1,
          publicHazards: 1,
          pendingReviewHazards: 0,
          rejectedHazards: 0,
          omittedUnpositionedHazards: 0,
        },
      },
    });
    expect(acceptedOverlay.json().features).toEqual(
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
            reviewStatus: 'accepted',
            reviewedAt: '2026-05-06T12:10:00.000Z',
          }),
        }),
      ])
    );
  });

  it('serves privacy-preserving aggregate community GeoJSON cells', async () => {
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
    await app.inject({
      method: 'POST',
      url: '/api/community/observations',
      payload: sampleObservationBatch,
    });

    const pendingAggregates = await app.inject({
      method: 'GET',
      url: '/api/community/aggregates.geojson',
    });

    expect(pendingAggregates.statusCode).toBe(200);
    expect(pendingAggregates.json()).toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        schemaVersion: 'harbourmesh.community-aggregates.v1',
        intendedUse: 'community_reference_overlay',
        officialChartDataIncluded: false,
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
        sourceRecordCounts: {
          soundings: 1,
          acceptedSoundings: 1,
          rejectedSoundings: 0,
          observations: 2,
          positionedObservations: 1,
          hazards: 1,
          publicHazards: 0,
          aggregateCells: 1,
        },
      },
    });
    expect(pendingAggregates.json().features[0]).toMatchObject({
      id: 'aggregate:45.2700:-66.0600',
      geometry: {
        type: 'Polygon',
      },
      properties: {
        kind: 'aggregate_cell',
        soundingCount: 1,
        observationCount: 1,
        radarContactObservationCount: 1,
        weatherObservationCount: 0,
        hazardCount: 0,
        averageDepthMeters: 12.5,
        averageConfidence: 0.9,
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
        officialChartDataIncluded: false,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/community/hazards/hazard-1/review',
      payload: {
        status: 'accepted',
        reviewedBy: 'nb-pilot-reviewer',
      },
    });

    const acceptedAggregates = await app.inject({
      method: 'GET',
      url: '/api/community/aggregates.geojson',
    });
    const aggregateBody = acceptedAggregates.json();
    const aggregateFeature = aggregateBody.features[0];

    expect(acceptedAggregates.statusCode).toBe(200);
    expect(aggregateBody).toMatchObject({
      metadata: {
        sourceRecordCounts: {
          publicHazards: 1,
          aggregateCells: 1,
        },
      },
    });
    expect(aggregateFeature.properties).toMatchObject({
      soundingCount: 1,
      observationCount: 1,
      hazardCount: 1,
      mediumHazardCount: 1,
    });
    expect(aggregateFeature.properties).not.toHaveProperty('vesselId');
    expect(aggregateFeature.properties).not.toHaveProperty('sourceDeviceId');
    expect(JSON.stringify(aggregateBody)).not.toContain('vessel-1');
  });

  it('returns not found for reviews of unknown hazards', async () => {
    const app = await createTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/community/hazards/missing-hazard/review',
      payload: {
        status: 'rejected',
        reviewedBy: 'nb-pilot-reviewer',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'hazard_not_found',
    });
  });

  it('records hazard review audit history', async () => {
    const app = await createTestApp();

    await app.inject({
      method: 'POST',
      url: '/api/community/hazards',
      payload: sampleHazardBatch,
    });

    await app.inject({
      method: 'POST',
      url: '/api/community/hazards/hazard-1/review',
      payload: {
        status: 'rejected',
        reviewedBy: 'nb-pilot-reviewer',
        reviewedAt: '2026-05-06T12:20:00.000Z',
        note: 'Duplicate report from same area.',
      },
    });

    const history = await app.inject({
      method: 'GET',
      url: '/api/community/hazards/reviews',
    });

    expect(history.statusCode).toBe(200);
    expect(history.json()).toMatchObject({
      reviews: [
        {
          hazardId: 'hazard-1',
          status: 'rejected',
          reviewedBy: 'nb-pilot-reviewer',
          reviewedAt: '2026-05-06T12:20:00.000Z',
          note: 'Duplicate report from same area.',
        },
      ],
    });
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

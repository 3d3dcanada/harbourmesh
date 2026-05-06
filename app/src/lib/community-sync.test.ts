import { describe, expect, it, vi } from 'vitest';
import type { CommunityHazardSyncBatch, CommunityObservationSyncBatch, CommunitySyncBatch } from '@/store';
import { uploadCommunityHazardBatch, uploadCommunityObservationBatch, uploadCommunitySoundingBatch } from './community-sync';

const batch: CommunitySyncBatch = {
  id: 'batch-1',
  status: 'queued',
  queuedAt: '2026-05-06T12:00:00.000Z',
  updatedAt: '2026-05-06T12:00:00.000Z',
  endpoint: '/api/community/soundings',
  attemptCount: 0,
  payload: {
    id: 'batch-1',
    schemaVersion: 'harbourmesh.community-soundings.v1',
    createdAt: '2026-05-06T12:00:00.000Z',
    region: 'NB_PILOT',
    recordCount: 0,
    records: [],
    policy: {
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      containsFullSharedPositions: false,
      rawLocalPositionsIncluded: false,
      uploadEndpoint: '/api/community/soundings',
    },
  },
};

const hazardBatch: CommunityHazardSyncBatch = {
  id: 'hazard-batch-1',
  status: 'queued',
  queuedAt: '2026-05-06T12:05:00.000Z',
  updatedAt: '2026-05-06T12:05:00.000Z',
  endpoint: '/api/community/hazards',
  attemptCount: 0,
  payload: {
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
        reportedAt: '2026-05-06T12:04:00.000Z',
        sharingState: 'shareable_no_position',
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
  },
};

const observationBatch: CommunityObservationSyncBatch = {
  id: 'observation-batch-1',
  status: 'queued',
  queuedAt: '2026-05-06T12:07:00.000Z',
  updatedAt: '2026-05-06T12:07:00.000Z',
  endpoint: '/api/community/observations',
  attemptCount: 0,
  payload: {
    id: 'observation-batch-1',
    schemaVersion: 'harbourmesh.community-observations.v1',
    createdAt: '2026-05-06T12:07:00.000Z',
    region: 'NB_PILOT',
    recordCount: 1,
    observations: [
      {
        id: 'weather-1',
        vesselId: 'vessel-1',
        sourceDeviceId: 'boat-node-001',
        sourceProtocol: 'signalk',
        observationType: 'weather',
        observedAt: '2026-05-06T12:06:40.000Z',
        receivedAt: '2026-05-06T12:06:41.000Z',
        sharingState: 'shareable_no_position',
        consentCapturedAt: '2026-05-06T11:59:00.000Z',
        metrics: {
          windSpeedKnots: 13.4,
        },
        quality: {
          confidence: 0.84,
          rejected: false,
          flags: [],
        },
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
  },
};

describe('community sync', () => {
  it('uploads a queued batch and validates the receipt', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      receiptId: 'receipt-1',
      batchId: 'batch-1',
      acceptedCount: 1,
      duplicateCount: 0,
      storedAt: '2026-05-06T12:01:00.000Z',
    }), { status: 202 }));

    await expect(uploadCommunitySoundingBatch(batch, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      receiptId: 'receipt-1',
      batchId: 'batch-1',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });

  it('fails when the API rejects the batch', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: 'invalid_community_sounding_batch',
    }), { status: 400 }));

    await expect(uploadCommunitySoundingBatch(batch, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('invalid_community_sounding_batch');
  });

  it('uploads a queued hazard batch and validates the receipt', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      receiptId: 'hazard-receipt-1',
      batchId: 'hazard-batch-1',
      acceptedCount: 1,
      duplicateCount: 0,
      storedAt: '2026-05-06T12:06:00.000Z',
    }), { status: 202 }));

    await expect(uploadCommunityHazardBatch(hazardBatch, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      receiptId: 'hazard-receipt-1',
      batchId: 'hazard-batch-1',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });

  it('uploads a queued observation batch and validates the receipt', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      receiptId: 'observation-receipt-1',
      batchId: 'observation-batch-1',
      acceptedCount: 1,
      duplicateCount: 0,
      storedAt: '2026-05-06T12:08:00.000Z',
    }), { status: 202 }));

    await expect(uploadCommunityObservationBatch(observationBatch, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      receiptId: 'observation-receipt-1',
      batchId: 'observation-batch-1',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/observations', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });
});

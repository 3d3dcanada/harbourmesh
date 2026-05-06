import { describe, expect, it, vi } from 'vitest';
import type { CommunitySyncBatch } from '@/store';
import { uploadCommunitySoundingBatch } from './community-sync';

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
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      receiptId: 'receipt-1',
      batchId: 'batch-1',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings', expect.objectContaining({
      method: 'POST',
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
});

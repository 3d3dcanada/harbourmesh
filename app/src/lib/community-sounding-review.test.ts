import { describe, expect, it, vi } from 'vitest';
import {
  listCommunitySoundingReviews,
  listCommunitySoundingsForReview,
  reviewCommunitySounding,
} from './community-sounding-review';

describe('community sounding review API client', () => {
  it('loads the protected sounding review queue with an API key', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      soundings: [
        {
          id: 'sounding-1',
          vesselId: 'vessel-1',
          sourceDeviceId: 'signalk',
          sourceProtocol: 'signalk',
          rawMessageId: 'env-1',
          timestamp: '2026-05-06T12:00:00.000Z',
          receivedAt: '2026-05-06T12:00:01.000Z',
          latitude: 45.27,
          longitude: -66.06,
          sharingState: 'shareable_blurred',
          consentCapturedAt: '2026-05-06T11:59:00.000Z',
          rawDepthMeters: 12,
          depthMeters: 12.5,
          depthReference: 'below_transducer',
          tideCorrectionApplied: false,
          waterLevelCorrectionApplied: false,
          offsets: { surfaceToTransducerMeters: 0.5 },
          quality: { confidence: 0.9, rejected: false, flags: [] },
          batchId: 'batch-1',
          storedAt: '2026-05-06T12:01:00.000Z',
          region: 'NB_PILOT',
          reviewStatus: 'unreviewed',
        },
      ],
    }), { status: 200 }));

    await expect(listCommunitySoundingsForReview({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_review_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      soundings: [{ id: 'sounding-1', reviewStatus: 'unreviewed' }],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings/review', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_review_key_1234567890',
      }),
    }));
  });

  it('submits a sounding review decision and validates the receipt', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      soundingId: 'sounding-1',
      status: 'rejected',
      includedInAggregates: false,
      reviewedAt: '2026-05-06T12:10:00.000Z',
    }), { status: 202 }));

    await expect(reviewCommunitySounding({
      soundingId: 'sounding-1',
      status: 'rejected',
      reviewedBy: 'nb-pilot-reviewer',
      reason: 'outlier',
      note: ' Depth spike rejected ',
    }, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_review_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      soundingId: 'sounding-1',
      status: 'rejected',
      includedInAggregates: false,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings/sounding-1/review', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        status: 'rejected',
        reviewedBy: 'nb-pilot-reviewer',
        reason: 'outlier',
        note: 'Depth spike rejected',
      }),
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_review_key_1234567890',
      }),
    }));
  });

  it('loads sounding review history and supports short-lived Bearer sessions', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      reviews: [
        {
          soundingId: 'sounding-1',
          status: 'accepted',
          reviewedBy: 'nb-pilot-reviewer',
          reviewedAt: '2026-05-06T12:20:00.000Z',
          reason: 'other',
        },
      ],
    }), { status: 200 }));

    await expect(listCommunitySoundingReviews({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_session_v1.payload.signature',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      reviews: [{ soundingId: 'sounding-1', status: 'accepted' }],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings/reviews', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer hm_session_v1.payload.signature',
      }),
    }));
  });

  it('adds account-session context beside review credentials', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      soundings: [],
    }), { status: 200 }));

    await listCommunitySoundingsForReview({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_review_key_1234567890',
      accountAccessToken: 'hm_user_session_v1.account.payload',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/soundings/review', expect.objectContaining({
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_review_key_1234567890',
        'X-HarbourMesh-Account-Session': 'hm_user_session_v1.account.payload',
      }),
    }));
  });

  it('fails on malformed responses and API errors', async () => {
    const malformedFetch = vi.fn(async () => new Response(JSON.stringify({
      soundings: [{ id: 'sounding-1', reviewStatus: 'pending' }],
    }), { status: 200 }));

    await expect(listCommunitySoundingsForReview({
      fetchImpl: malformedFetch as unknown as typeof fetch,
    })).rejects.toThrow('Sounding review queue returned an invalid response');

    const rejectedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: 'sounding_not_found',
    }), { status: 404 }));

    await expect(reviewCommunitySounding({
      soundingId: 'missing-sounding',
      status: 'rejected',
      reviewedBy: 'nb-pilot-reviewer',
    }, {
      fetchImpl: rejectedFetch as unknown as typeof fetch,
    })).rejects.toThrow('sounding_not_found');
  });
});

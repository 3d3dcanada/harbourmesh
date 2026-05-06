import { describe, expect, it, vi } from 'vitest';
import {
  listCommunityHazardReviews,
  listCommunityHazardsForReview,
  reviewCommunityHazard,
} from './community-hazard-review';

describe('community hazard review API client', () => {
  it('loads the protected hazard review queue with an API key', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      hazards: [
        {
          id: 'hazard-1',
          vesselId: 'vessel-1',
          type: 'debris',
          severity: 'medium',
          description: 'Floating debris near track',
          reportedAt: '2026-05-06T12:00:00.000Z',
          sharingState: 'shareable_no_position',
          consentCapturedAt: '2026-05-06T11:59:00.000Z',
          batchId: 'hazard-batch-1',
          storedAt: '2026-05-06T12:01:00.000Z',
          region: 'NB_PILOT',
          reviewStatus: 'pending',
          publicOverlayEligible: false,
        },
      ],
    }), { status: 200 }));

    await expect(listCommunityHazardsForReview({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      hazards: [{ id: 'hazard-1', reviewStatus: 'pending' }],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/review', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });

  it('submits a hazard review decision and validates the receipt', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      hazardId: 'hazard-1',
      status: 'accepted',
      publicOverlayEligible: true,
      reviewedAt: '2026-05-06T12:10:00.000Z',
    }), { status: 202 }));

    await expect(reviewCommunityHazard({
      hazardId: 'hazard-1',
      status: 'accepted',
      reviewedBy: 'nb-pilot-reviewer',
      note: ' Confirmed from local report ',
    }, {
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_api_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      hazardId: 'hazard-1',
      status: 'accepted',
      publicOverlayEligible: true,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/hazard-1/review', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        status: 'accepted',
        reviewedBy: 'nb-pilot-reviewer',
        note: 'Confirmed from local report',
      }),
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_api_key_1234567890',
      }),
    }));
  });

  it('loads hazard review history with a review API key', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      reviews: [
        {
          hazardId: 'hazard-1',
          status: 'rejected',
          reviewedBy: 'nb-pilot-reviewer',
          reviewedAt: '2026-05-06T12:20:00.000Z',
          note: 'Duplicate report from same area.',
        },
      ],
    }), { status: 200 }));

    await expect(listCommunityHazardReviews({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_test_review_key_1234567890',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      reviews: [{ hazardId: 'hazard-1', status: 'rejected' }],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/reviews', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'hm_test_review_key_1234567890',
      }),
    }));
  });

  it('sends short-lived review sessions as Bearer credentials', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      hazards: [],
    }), { status: 200 }));

    await expect(listCommunityHazardsForReview({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_session_v1.payload.signature',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      hazards: [],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/review', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer hm_session_v1.payload.signature',
      }),
    }));
  });

  it('adds account-session context beside review credentials', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      hazards: [],
    }), { status: 200 }));

    await listCommunityHazardsForReview({
      apiBaseUrl: 'http://localhost:3001',
      apiKey: 'hm_session_v1.review.payload',
      accountAccessToken: 'hm_user_session_v1.account.payload',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/review', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer hm_session_v1.review.payload',
        'X-HarbourMesh-Account-Session': 'hm_user_session_v1.account.payload',
      }),
    }));
  });

  it('rejects malformed hazard review history', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      reviews: [{ hazardId: 'hazard-1', status: 'pending' }],
    }), { status: 200 }));

    await expect(listCommunityHazardReviews({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Hazard review history returned an invalid response');
  });

  it('fails on API errors and invalid receipts', async () => {
    const rejectedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: 'hazard_not_found',
    }), { status: 404 }));

    await expect(reviewCommunityHazard({
      hazardId: 'missing-hazard',
      status: 'rejected',
      reviewedBy: 'nb-pilot-reviewer',
    }, {
      fetchImpl: rejectedFetch as unknown as typeof fetch,
    })).rejects.toThrow('hazard_not_found');

    const invalidFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      hazardId: 'hazard-1',
    }), { status: 202 }));

    await expect(reviewCommunityHazard({
      hazardId: 'hazard-1',
      status: 'accepted',
      reviewedBy: 'nb-pilot-reviewer',
    }, {
      fetchImpl: invalidFetch as unknown as typeof fetch,
    })).rejects.toThrow('Hazard review returned an invalid receipt');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ACCOUNT_SESSION_STORAGE_KEY } from './account-session';
import { fetchAccountCommunityContributions, type AccountCommunityContributions } from './account-contributions';

function createStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    store,
  };
}

const sampleSession = {
  accessToken: 'hm_user_session_v1.payload.signature',
  tokenType: 'Bearer' as const,
  account: {
    id: 'acct_1',
    email: 'captain@example.com',
    displayName: 'Captain Example',
    roles: ['user' as const],
    status: 'active' as const,
    createdAt: '2026-05-06T18:00:00.000Z',
    updatedAt: '2026-05-06T18:00:00.000Z',
  },
  issuedAt: '2026-05-06T18:00:00.000Z',
  expiresAt: '2099-05-06T19:00:00.000Z',
  keyId: 'account-session-key',
};

const contributionResponse: AccountCommunityContributions = {
  ok: true,
  accountId: 'acct_1',
  generatedAt: '2026-05-06T19:00:00.000Z',
  summary: {
    totalRecords: 5,
    soundings: 1,
    hazards: 1,
    observations: 1,
    devices: 1,
    aggregateReleases: 1,
    byReviewStatus: {
      accepted: 1,
      pending: 1,
    },
  },
  recentItems: [
    {
      id: 'community-aggregate-release:2026-05-06T19:00:00.000Z',
      kind: 'aggregate_release',
      region: 'NB_PILOT',
      status: 'published',
      createdAt: '2026-05-06T19:00:00.000Z',
    },
  ],
};

describe('account community contributions client', () => {
  it('loads account-scoped contributions with the stored account-session header', async () => {
    const storage = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: JSON.stringify({
        savedAt: '2026-05-06T18:00:00.000Z',
        session: sampleSession,
      }),
    });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(contributionResponse), { status: 200 }));

    await expect(fetchAccountCommunityContributions({
      apiBaseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    })).resolves.toEqual(contributionResponse);

    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/account/community/contributions', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'X-HarbourMesh-Account-Session': sampleSession.accessToken,
      }),
    }));
  });

  it('requires an account session before calling the API', async () => {
    const fetchImpl = vi.fn();

    await expect(fetchAccountCommunityContributions({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage: createStorage(),
    })).rejects.toThrow('account_session_required');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('clears invalid account sessions and rejects malformed responses', async () => {
    const storage = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: JSON.stringify({
        savedAt: '2026-05-06T18:00:00.000Z',
        session: sampleSession,
      }),
    });
    const rejectedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: 'invalid_account_session',
    }), { status: 403 }));

    await expect(fetchAccountCommunityContributions({
      fetchImpl: rejectedFetch as unknown as typeof fetch,
      storage,
    })).rejects.toThrow('invalid_account_session');
    expect(storage.store).not.toHaveProperty(ACCOUNT_SESSION_STORAGE_KEY);

    const malformedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      summary: {},
    }), { status: 200 }));
    await expect(fetchAccountCommunityContributions({
      accountAccessToken: sampleSession.accessToken,
      fetchImpl: malformedFetch as unknown as typeof fetch,
      storage: null,
    })).rejects.toThrow('Account contribution response was not a HarbourMesh contribution summary');
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  PILOT_API_CREDENTIALS_STORAGE_KEY,
  clearPilotApiCredentials,
  getPilotApiCredentials,
  isPilotReviewSessionFresh,
  requestPilotOperatorSession,
  resolvePilotApiKey,
  resolvePilotOperatorId,
  resolvePilotReviewCredential,
  savePilotApiCredentials,
  savePilotReviewSession,
} from './pilot-api-credentials';

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

describe('pilot API credentials', () => {
  it('saves trimmed API credentials in the excluded local store', () => {
    const storage = createStorage();

    const saved = savePilotApiCredentials({
      apiKey: '  hm_test_key  ',
      operatorId: ' nb-ops ',
    }, storage, '2026-05-06T13:30:00.000Z');

    expect(saved).toMatchObject({
      apiKey: 'hm_test_key',
      operatorId: 'nb-ops',
      savedAt: '2026-05-06T13:30:00.000Z',
    });
    expect(JSON.parse(storage.store[PILOT_API_CREDENTIALS_STORAGE_KEY])).toMatchObject({
      schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
      apiKey: 'hm_test_key',
      operatorId: 'nb-ops',
    });
  });

  it('resolves explicit values before stored credentials', () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: JSON.stringify({
        schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
        apiKey: 'stored-key',
        operatorId: 'stored-operator',
        savedAt: '2026-05-06T13:30:00.000Z',
      }),
    });

    expect(getPilotApiCredentials(storage)).toMatchObject({
      apiKey: 'stored-key',
      operatorId: 'stored-operator',
    });
    expect(resolvePilotApiKey(undefined, storage)).toBe('stored-key');
    expect(resolvePilotApiKey('explicit-key', storage)).toBe('explicit-key');
    expect(resolvePilotOperatorId(undefined, storage)).toBe('stored-operator');
    expect(resolvePilotOperatorId('explicit-operator', storage)).toBe('explicit-operator');
  });

  it('stores and prefers a fresh review session for review-scoped requests', () => {
    const storage = createStorage();
    savePilotApiCredentials({ apiKey: 'stored-review-key', operatorId: 'nb-ops' }, storage, '2026-05-06T13:30:00.000Z');
    const saved = savePilotReviewSession({
      accessToken: 'hm_session_v1.payload.signature',
      tokenType: 'Bearer',
      operatorId: 'nb-session-reviewer',
      scopes: ['review'],
      issuedAt: '2026-05-06T13:31:00.000Z',
      expiresAt: '2026-05-06T13:46:00.000Z',
      keyId: 'nb-session-test-key',
    }, storage, '2026-05-06T13:31:00.000Z');

    expect(saved).toMatchObject({
      apiKey: 'stored-review-key',
      operatorId: 'nb-session-reviewer',
      reviewSessionToken: 'hm_session_v1.payload.signature',
      reviewSessionExpiresAt: '2026-05-06T13:46:00.000Z',
      reviewSessionKeyId: 'nb-session-test-key',
    });
    expect(isPilotReviewSessionFresh(saved, new Date('2026-05-06T13:40:00.000Z'))).toBe(true);
    expect(resolvePilotReviewCredential(undefined, storage, new Date('2026-05-06T13:40:00.000Z'))).toBe('hm_session_v1.payload.signature');
    expect(resolvePilotReviewCredential('explicit-review-key', storage, new Date('2026-05-06T13:40:00.000Z'))).toBe('explicit-review-key');
    expect(resolvePilotApiKey(undefined, storage)).toBe('stored-review-key');
  });

  it('falls back to the stored API key when a review session expires', () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: JSON.stringify({
        schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
        apiKey: 'stored-review-key',
        operatorId: 'nb-session-reviewer',
        reviewSessionToken: 'hm_session_v1.expired.signature',
        reviewSessionIssuedAt: '2026-05-06T13:31:00.000Z',
        reviewSessionExpiresAt: '2026-05-06T13:46:00.000Z',
        reviewSessionOperatorId: 'nb-session-reviewer',
        reviewSessionKeyId: 'nb-session-test-key',
        savedAt: '2026-05-06T13:31:00.000Z',
      }),
    });

    expect(isPilotReviewSessionFresh(getPilotApiCredentials(storage), new Date('2026-05-06T13:50:00.000Z'))).toBe(false);
    expect(resolvePilotReviewCredential(undefined, storage, new Date('2026-05-06T13:50:00.000Z'))).toBe('stored-review-key');
  });

  it('requests short-lived operator sessions with the long-lived pilot API key', async () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: JSON.stringify({
        schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
        apiKey: 'stored-review-key',
        operatorId: 'stored-operator',
        savedAt: '2026-05-06T13:30:00.000Z',
      }),
    });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      session: {
        accessToken: 'hm_session_v1.payload.signature',
        tokenType: 'Bearer',
        operatorId: 'nb-session-reviewer',
        scopes: ['review'],
        issuedAt: '2026-05-06T13:31:00.000Z',
        expiresAt: '2026-05-06T13:46:00.000Z',
        keyId: 'nb-session-test-key',
      },
    }), { status: 201 }));

    await expect(requestPilotOperatorSession({
      apiBaseUrl: 'http://localhost:3001',
      operatorId: 'client-operator',
      ttlSeconds: 120,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    })).resolves.toMatchObject({
      accessToken: 'hm_session_v1.payload.signature',
      operatorId: 'nb-session-reviewer',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/auth/operator-session', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'stored-review-key',
      }),
      body: JSON.stringify({
        operatorId: 'client-operator',
        ttlSeconds: 120,
      }),
    }));
  });

  it('clears empty or explicitly cleared credential storage', () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: 'bad-json',
    });

    expect(getPilotApiCredentials(storage)).toBeNull();
    expect(savePilotApiCredentials({ apiKey: ' ', operatorId: '' }, storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(PILOT_API_CREDENTIALS_STORAGE_KEY);

    savePilotApiCredentials({ apiKey: 'hm_test_key' }, storage);
    clearPilotApiCredentials(storage);
    expect(storage.store).not.toHaveProperty(PILOT_API_CREDENTIALS_STORAGE_KEY);
  });
});

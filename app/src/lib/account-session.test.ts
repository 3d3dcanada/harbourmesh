import { describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_SESSION_STORAGE_KEY,
  clearAccountSession,
  fetchCurrentAccount,
  getAccountSession,
  loginAccount,
  replaceAccountSessionAccount,
  registerAccount,
} from './account-session';

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
  expiresAt: '2026-05-06T19:00:00.000Z',
  keyId: 'account-session-key',
};

describe('account session client', () => {
  it('registers accounts and stores only the returned session envelope', async () => {
    const storage = createStorage();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      session: sampleSession,
    }), { status: 201 }));

    const envelope = await registerAccount({
      email: ' captain@example.com ',
      displayName: ' Captain Example ',
      password: 'Correct Horse Battery 2026!',
      inviteCode: ' nb-beta ',
    }, {
      apiBaseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    });

    expect(envelope.session.account.email).toBe('captain@example.com');
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        email: 'captain@example.com',
        displayName: 'Captain Example',
        password: 'Correct Horse Battery 2026!',
        inviteCode: 'nb-beta',
      }),
    }));
    expect(storage.store[ACCOUNT_SESSION_STORAGE_KEY]).toContain('hm_user_session_v1');
    expect(storage.store[ACCOUNT_SESSION_STORAGE_KEY]).not.toContain('Correct Horse Battery');
  });

  it('logs in, loads fresh sessions, and ignores expired or malformed storage', async () => {
    const storage = createStorage();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      session: sampleSession,
    }), { status: 201 }));

    await loginAccount({
      email: 'captain@example.com',
      password: 'Correct Horse Battery 2026!',
    }, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    });

    expect(getAccountSession(storage, new Date('2026-05-06T18:30:00.000Z'))?.session.account.id).toBe('acct_1');
    expect(getAccountSession(storage, new Date('2026-05-06T19:30:00.000Z'))).toBeNull();

    const malformed = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: '{bad-json',
    });
    expect(getAccountSession(malformed)).toBeNull();
  });

  it('fetches the current account with a Bearer session and clears invalid sessions', async () => {
    const storage = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: JSON.stringify({
        savedAt: '2026-05-06T18:00:00.000Z',
        session: sampleSession,
      }),
    });
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      account: sampleSession.account,
    }), { status: 200 }));

    const account = await fetchCurrentAccount({
      apiBaseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    });

    expect(account.email).toBe('captain@example.com');
    expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: `Bearer ${sampleSession.accessToken}`,
      }),
    }));

    const rejectedFetch = vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      error: 'invalid_account_session',
    }), { status: 403 }));
    await expect(fetchCurrentAccount({
      fetchImpl: rejectedFetch as unknown as typeof fetch,
      storage,
    })).rejects.toThrow('invalid_account_session');
    expect(storage.store).not.toHaveProperty(ACCOUNT_SESSION_STORAGE_KEY);
  });

  it('clears saved sessions', () => {
    const storage = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: JSON.stringify({
        savedAt: '2026-05-06T18:00:00.000Z',
        session: sampleSession,
      }),
    });

    clearAccountSession(storage);
    expect(storage.store).not.toHaveProperty(ACCOUNT_SESSION_STORAGE_KEY);
  });

  it('replaces the stored account without changing the access token', () => {
    const storage = createStorage({
      [ACCOUNT_SESSION_STORAGE_KEY]: JSON.stringify({
        savedAt: '2026-05-06T18:00:00.000Z',
        session: sampleSession,
      }),
    });

    const envelope = replaceAccountSessionAccount({
      ...sampleSession.account,
      displayName: 'Captain Updated',
      roles: ['user', 'operator'],
      updatedAt: '2026-05-06T18:20:00.000Z',
    }, storage, '2026-05-06T18:21:00.000Z');

    expect(envelope?.session.accessToken).toBe(sampleSession.accessToken);
    expect(envelope?.session.account.displayName).toBe('Captain Updated');
    expect(envelope?.savedAt).toBe('2026-05-06T18:21:00.000Z');
    expect(storage.store[ACCOUNT_SESSION_STORAGE_KEY]).toContain('Captain Updated');
  });
});

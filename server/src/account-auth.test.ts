import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PASSWORD_HASH_ITERATIONS,
  ACCOUNT_SESSION_PREFIX,
  createAccountAuthConfig,
  createAccountSessionToken,
  createUserAccountRepository,
  toPublicUserAccount,
  verifyAccountSessionToken,
} from './account-auth.js';
import { buildApp } from './app.js';

async function createTempDataDir() {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  return mkdtemp(join(testRoot, 'harbourmesh-account-auth-test-'));
}

describe('account auth', () => {
  it('stores account passwords as PBKDF2 hashes and returns only public account fields', async () => {
    const repository = createUserAccountRepository(await createTempDataDir());
    const account = await repository.createAccount({
      email: 'Captain@example.com',
      displayName: 'Captain Example',
      password: 'Correct Horse Battery 2026!',
    }, '2026-05-06T18:00:00.000Z');

    expect(account).toMatchObject({
      email: 'Captain@example.com',
      emailNormalized: 'captain@example.com',
      passwordHashAlgorithm: 'pbkdf2-hmac-sha256',
      passwordHashIterations: ACCOUNT_PASSWORD_HASH_ITERATIONS,
      roles: ['user'],
      status: 'active',
    });
    expect(account?.passwordHash).not.toBe('Correct Horse Battery 2026!');
    expect(account?.passwordSalt).toMatch(/^[a-f0-9]{32}$/);

    await expect(repository.verifyCredentials('captain@example.com', 'Correct Horse Battery 2026!'))
      .resolves.toMatchObject({ id: account?.id });
    await expect(repository.verifyCredentials('captain@example.com', 'wrong password'))
      .resolves.toBeNull();

    expect(toPublicUserAccount(account!)).not.toHaveProperty('passwordHash');
    expect(toPublicUserAccount(account!)).not.toHaveProperty('passwordSalt');
  });

  it('signs, verifies, expires, and rejects tampered account sessions', async () => {
    const repository = createUserAccountRepository(await createTempDataDir());
    const account = await repository.createAccount({
      email: 'session@example.com',
      displayName: 'Session User',
      password: 'Correct Horse Battery 2026!',
    }, '2026-05-06T18:00:00.000Z');
    const config = createAccountAuthConfig({
      sessionSigningKey: 'account-session-secret',
      sessionSigningKeyId: 'account-session-key',
      sessionTtlSeconds: 60,
    });

    const session = createAccountSessionToken(config, account!, {
      now: new Date('2026-05-06T18:00:00.000Z'),
    });

    expect(session?.accessToken).toMatch(new RegExp(`^${ACCOUNT_SESSION_PREFIX}\\.`));
    expect(verifyAccountSessionToken(config, session?.accessToken, new Date('2026-05-06T18:00:30.000Z')))
      .toMatchObject({
        accountId: account?.id,
        email: 'session@example.com',
        roles: ['user'],
      });
    expect(verifyAccountSessionToken(config, `${session?.accessToken}tampered`, new Date('2026-05-06T18:00:30.000Z')))
      .toBeNull();
    expect(verifyAccountSessionToken(config, session?.accessToken, new Date('2026-05-06T18:02:00.000Z')))
      .toBeNull();
  });

  it('supports invite-gated registration, login, and current-account lookup through the API', async () => {
    const app = await buildApp({
      dataDir: await createTempDataDir(),
      accountSessionSigningKey: 'api-account-session-secret',
      accountSessionSigningKeyId: 'api-account-session-key',
      accountRegistrationRequiresInvite: true,
      accountRegistrationInviteCode: 'nb-beta-invite',
    });

    const rejectedInvite = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'captain@example.com',
        displayName: 'Captain Example',
        password: 'Correct Horse Battery 2026!',
        inviteCode: 'wrong-code',
      },
    });
    expect(rejectedInvite.statusCode).toBe(403);

    const registered = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'captain@example.com',
        displayName: 'Captain Example',
        password: 'Correct Horse Battery 2026!',
        inviteCode: 'nb-beta-invite',
      },
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({
      ok: true,
      session: {
        tokenType: 'Bearer',
        keyId: 'api-account-session-key',
        account: {
          email: 'captain@example.com',
          displayName: 'Captain Example',
          roles: ['user'],
          status: 'active',
        },
      },
    });
    expect(JSON.stringify(registered.json())).not.toContain('passwordHash');
    expect(JSON.stringify(registered.json())).not.toContain('passwordSalt');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'CAPTAIN@example.com',
        displayName: 'Captain Example',
        password: 'Correct Horse Battery 2026!',
        inviteCode: 'nb-beta-invite',
      },
    });
    expect(duplicate.statusCode).toBe(409);

    const failedLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'captain@example.com',
        password: 'wrong password',
      },
    });
    expect(failedLogin.statusCode).toBe(401);

    const loggedIn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'captain@example.com',
        password: 'Correct Horse Battery 2026!',
      },
    });
    expect(loggedIn.statusCode).toBe(201);

    const currentAccount = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${loggedIn.json().session.accessToken}`,
      },
    });
    expect(currentAccount.statusCode).toBe(200);
    expect(currentAccount.json()).toMatchObject({
      ok: true,
      account: {
        email: 'captain@example.com',
        displayName: 'Captain Example',
        roles: ['user'],
      },
      session: {
        keyId: 'api-account-session-key',
      },
    });

    await app.close();
  });

  it('fails account endpoints closed when the account session signing key is absent', async () => {
    const app = await buildApp({
      dataDir: await createTempDataDir(),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'captain@example.com',
        displayName: 'Captain Example',
        password: 'Correct Horse Battery 2026!',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      ok: false,
      error: 'account_session_signing_not_configured',
    });

    await app.close();
  });
});

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

export const ACCOUNT_SESSION_PREFIX = 'hm_user_session_v1';
export const ACCOUNT_PASSWORD_HASH_ITERATIONS = 600_000;
const ACCOUNT_PASSWORD_KEY_LENGTH = 32;
const DEFAULT_ACCOUNT_SESSION_TTL_SECONDS = 60 * 60;

export type AccountRole = 'user' | 'operator' | 'admin';

export type UserAccountStatus = 'active' | 'disabled';

export type StoredUserAccount = {
  id: string;
  email: string;
  emailNormalized: string;
  displayName: string;
  roles: AccountRole[];
  status: UserAccountStatus;
  passwordHash: string;
  passwordSalt: string;
  passwordHashAlgorithm: 'pbkdf2-hmac-sha256';
  passwordHashIterations: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicUserAccount = Omit<
  StoredUserAccount,
  'emailNormalized' | 'passwordHash' | 'passwordSalt' | 'passwordHashAlgorithm' | 'passwordHashIterations'
>;

export type AccountSessionToken = {
  accessToken: string;
  tokenType: 'Bearer';
  account: PublicUserAccount;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export type AccountSessionPayload = {
  schemaVersion: 'harbourmesh.account-session.v1';
  accountId: string;
  email: string;
  roles: AccountRole[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export type AccountAuthConfig = {
  sessionSigningKey?: string;
  sessionSigningKeyId: string;
  sessionTtlSeconds: number;
  registrationInviteCode?: string;
  registrationRequiresInvite: boolean;
};

export type AccountRegistrationInput = {
  email: string;
  displayName: string;
  password: string;
  inviteCode?: string;
};

export type UserAccountRepository = {
  createAccount: (input: AccountRegistrationInput, now?: string) => Promise<StoredUserAccount | null>;
  getAccountByEmail: (email: string) => Promise<StoredUserAccount | null>;
  getAccountById: (accountId: string) => Promise<StoredUserAccount | null>;
  verifyCredentials: (email: string, password: string) => Promise<StoredUserAccount | null>;
};

export const accountRegistrationSchema = z.object({
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(200),
  inviteCode: z.string().trim().min(4).max(120).optional(),
}).strict();

export const accountLoginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
}).strict();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function signSessionPayload(unsignedToken: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(unsignedToken).digest('base64url');
}

export function hashAccountPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return {
    passwordHash: pbkdf2Sync(
      password,
      Buffer.from(salt, 'hex'),
      ACCOUNT_PASSWORD_HASH_ITERATIONS,
      ACCOUNT_PASSWORD_KEY_LENGTH,
      'sha256'
    ).toString('hex'),
    passwordSalt: salt,
    passwordHashAlgorithm: 'pbkdf2-hmac-sha256' as const,
    passwordHashIterations: ACCOUNT_PASSWORD_HASH_ITERATIONS,
  };
}

export function verifyAccountPassword(password: string, account: StoredUserAccount): boolean {
  if (
    account.passwordHashAlgorithm !== 'pbkdf2-hmac-sha256' ||
    account.passwordHashIterations !== ACCOUNT_PASSWORD_HASH_ITERATIONS ||
    !/^[a-f0-9]{32}$/i.test(account.passwordSalt) ||
    !/^[a-f0-9]{64}$/i.test(account.passwordHash)
  ) {
    return false;
  }

  const candidate = hashAccountPassword(password, account.passwordSalt);
  return constantTimeEquals(candidate.passwordHash, account.passwordHash);
}

export function toPublicUserAccount(account: StoredUserAccount): PublicUserAccount {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    roles: account.roles,
    status: account.status,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function isAccountRole(value: unknown): value is AccountRole {
  return value === 'user' || value === 'operator' || value === 'admin';
}

function parseStoredAccount(value: unknown): StoredUserAccount | null {
  const account = value as Partial<StoredUserAccount>;
  if (
    typeof account.id !== 'string' ||
    typeof account.email !== 'string' ||
    typeof account.emailNormalized !== 'string' ||
    typeof account.displayName !== 'string' ||
    !Array.isArray(account.roles) ||
    !account.roles.every(isAccountRole) ||
    (account.status !== 'active' && account.status !== 'disabled') ||
    typeof account.passwordHash !== 'string' ||
    typeof account.passwordSalt !== 'string' ||
    account.passwordHashAlgorithm !== 'pbkdf2-hmac-sha256' ||
    typeof account.passwordHashIterations !== 'number' ||
    typeof account.createdAt !== 'string' ||
    typeof account.updatedAt !== 'string'
  ) {
    return null;
  }

  return account as StoredUserAccount;
}

export function createUserAccountRepository(dataDir: string): UserAccountRepository {
  const accountsFile = resolveDataFile(dataDir, 'user-accounts.jsonl');

  async function listLatestAccounts(): Promise<StoredUserAccount[]> {
    const rows = await readJsonLines<unknown>(accountsFile);
    const latestById = new Map<string, StoredUserAccount>();

    for (const row of rows) {
      const account = parseStoredAccount(row);
      if (account) latestById.set(account.id, account);
    }

    return [...latestById.values()];
  }

  async function getAccountByEmail(email: string): Promise<StoredUserAccount | null> {
    const emailNormalized = normalizeEmail(email);
    return (await listLatestAccounts()).find((account) => account.emailNormalized === emailNormalized) ?? null;
  }

  return {
    async createAccount(input, now = new Date().toISOString()) {
      const emailNormalized = normalizeEmail(input.email);
      const existing = (await listLatestAccounts()).find((account) => account.emailNormalized === emailNormalized);
      if (existing) return null;

      const account: StoredUserAccount = {
        id: `acct_${randomBytes(16).toString('hex')}`,
        email: input.email.trim(),
        emailNormalized,
        displayName: input.displayName.trim(),
        roles: ['user'],
        status: 'active',
        ...hashAccountPassword(input.password),
        createdAt: now,
        updatedAt: now,
      };

      await appendJsonLine(accountsFile, account);
      return account;
    },

    getAccountByEmail,

    async getAccountById(accountId) {
      return (await listLatestAccounts()).find((account) => account.id === accountId) ?? null;
    },

    async verifyCredentials(email, password) {
      const account = await getAccountByEmail(email);
      if (!account || account.status !== 'active') return null;
      return verifyAccountPassword(password, account) ? account : null;
    },
  };
}

export function createAccountAuthConfig(config: {
  sessionSigningKey?: string;
  sessionSigningKeyId?: string;
  sessionTtlSeconds?: number;
  registrationInviteCode?: string;
  registrationRequiresInvite?: boolean;
}): AccountAuthConfig {
  return {
    sessionSigningKey: config.sessionSigningKey?.trim() || undefined,
    sessionSigningKeyId: config.sessionSigningKeyId?.trim() || 'harbourmesh-account-session-key',
    sessionTtlSeconds: Number.isFinite(config.sessionTtlSeconds) && config.sessionTtlSeconds && config.sessionTtlSeconds > 0
      ? Math.floor(config.sessionTtlSeconds)
      : DEFAULT_ACCOUNT_SESSION_TTL_SECONDS,
    registrationInviteCode: config.registrationInviteCode?.trim() || undefined,
    registrationRequiresInvite: config.registrationRequiresInvite ?? false,
  };
}

export function createAccountSessionToken(
  config: AccountAuthConfig,
  account: StoredUserAccount,
  input: { ttlSeconds?: number; now?: Date } = {}
): AccountSessionToken | null {
  if (!config.sessionSigningKey || account.status !== 'active') return null;

  const now = input.now ?? new Date();
  const ttlSeconds = Number.isFinite(input.ttlSeconds) && input.ttlSeconds && input.ttlSeconds > 0
    ? Math.min(Math.floor(input.ttlSeconds), config.sessionTtlSeconds)
    : config.sessionTtlSeconds;
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const publicAccount = toPublicUserAccount(account);
  const payload: AccountSessionPayload = {
    schemaVersion: 'harbourmesh.account-session.v1',
    accountId: account.id,
    email: account.emailNormalized,
    roles: account.roles,
    issuedAt,
    expiresAt,
    keyId: config.sessionSigningKeyId,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${ACCOUNT_SESSION_PREFIX}.${encodedPayload}`;
  const signature = signSessionPayload(unsignedToken, config.sessionSigningKey);

  return {
    accessToken: `${unsignedToken}.${signature}`,
    tokenType: 'Bearer',
    account: publicAccount,
    issuedAt,
    expiresAt,
    keyId: payload.keyId,
  };
}

function parseSessionPayload(value: unknown): AccountSessionPayload | null {
  const payload = value as Partial<AccountSessionPayload>;
  if (
    payload.schemaVersion !== 'harbourmesh.account-session.v1' ||
    typeof payload.accountId !== 'string' ||
    typeof payload.email !== 'string' ||
    !Array.isArray(payload.roles) ||
    !payload.roles.every(isAccountRole) ||
    typeof payload.issuedAt !== 'string' ||
    typeof payload.expiresAt !== 'string' ||
    typeof payload.keyId !== 'string'
  ) {
    return null;
  }

  return {
    schemaVersion: 'harbourmesh.account-session.v1',
    accountId: payload.accountId,
    email: payload.email,
    roles: [...new Set(payload.roles)],
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    keyId: payload.keyId,
  };
}

export function verifyAccountSessionToken(
  config: AccountAuthConfig,
  token: string | undefined,
  now = new Date()
): AccountSessionPayload | null {
  if (!config.sessionSigningKey || !token?.startsWith(`${ACCOUNT_SESSION_PREFIX}.`)) return null;

  const [prefix, encodedPayload, signature] = token.split('.');
  if (prefix !== ACCOUNT_SESSION_PREFIX || !encodedPayload || !signature) return null;

  const unsignedToken = `${prefix}.${encodedPayload}`;
  const expectedSignature = signSessionPayload(unsignedToken, config.sessionSigningKey);
  if (!constantTimeEquals(signature, expectedSignature)) return null;

  const decodedPayload = base64UrlDecode(encodedPayload);
  if (!decodedPayload) return null;

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(decodedPayload) as unknown;
  } catch {
    return null;
  }

  const payload = parseSessionPayload(parsedPayload);
  if (!payload || payload.keyId !== config.sessionSigningKeyId) return null;
  if (Date.parse(payload.expiresAt) <= now.getTime()) return null;
  return payload;
}

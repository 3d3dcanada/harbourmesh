export const ACCOUNT_SESSION_STORAGE_KEY = 'harbormesh-account-session';
export const ACCOUNT_SESSION_HEADER = 'X-HarbourMesh-Account-Session';

export type AccountRole = 'user' | 'operator' | 'admin';

export type PublicAccount = {
  id: string;
  email: string;
  displayName: string;
  roles: AccountRole[];
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
};

export type AccountSession = {
  accessToken: string;
  tokenType: 'Bearer';
  account: PublicAccount;
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export type AccountSessionEnvelope = {
  savedAt: string;
  session: AccountSession;
};

export type AccountRegisterInput = {
  email: string;
  displayName: string;
  password: string;
  inviteCode?: string;
};

export type AccountLoginInput = {
  email: string;
  password: string;
};

export type AccountApiOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: StorageLike | null;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;
  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAccountRole(value: unknown): value is AccountRole {
  return value === 'user' || value === 'operator' || value === 'admin';
}

function isPublicAccount(value: unknown): value is PublicAccount {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.displayName === 'string' &&
    Array.isArray(value.roles) &&
    value.roles.every(isAccountRole) &&
    (value.status === 'active' || value.status === 'disabled') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isAccountSession(value: unknown): value is AccountSession {
  if (!isRecord(value)) return false;

  return (
    typeof value.accessToken === 'string' &&
    value.tokenType === 'Bearer' &&
    isPublicAccount(value.account) &&
    typeof value.issuedAt === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.keyId === 'string'
  );
}

function normalizeOptional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null) as Promise<unknown>;
}

function responseError(body: unknown, fallback: string): Error {
  if (isRecord(body) && typeof body.error === 'string') return new Error(body.error);
  return new Error(fallback);
}

function saveSessionEnvelope(
  session: AccountSession,
  storage: StorageLike | null,
  savedAt = new Date().toISOString()
): AccountSessionEnvelope {
  const envelope = { savedAt, session };
  storage?.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

export function getAccountSession(
  storage: StorageLike | null = getDefaultStorage(),
  now = new Date()
): AccountSessionEnvelope | null {
  if (!storage) return null;
  const raw = storage.getItem(ACCOUNT_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || typeof parsed.savedAt !== 'string' || !isAccountSession(parsed.session)) return null;
    if (Date.parse(parsed.session.expiresAt) <= now.getTime()) return null;
    return parsed as AccountSessionEnvelope;
  } catch {
    return null;
  }
}

export function clearAccountSession(storage: StorageLike | null = getDefaultStorage()): void {
  storage?.removeItem(ACCOUNT_SESSION_STORAGE_KEY);
}

export function getAccountSessionAccessToken(
  storage: StorageLike | null = getDefaultStorage(),
  now = new Date()
): string | undefined {
  return getAccountSession(storage, now)?.session.accessToken;
}

export function buildAccountSessionHeaders(
  accountAccessToken?: string,
  storage: StorageLike | null = getDefaultStorage()
): Record<string, string> {
  const token = accountAccessToken?.trim() || getAccountSessionAccessToken(storage);
  return token ? { [ACCOUNT_SESSION_HEADER]: token } : {};
}

export function replaceAccountSessionAccount(
  account: PublicAccount,
  storage: StorageLike | null = getDefaultStorage(),
  savedAt = new Date().toISOString()
): AccountSessionEnvelope | null {
  const envelope = getAccountSession(storage);
  if (!envelope) return null;

  return saveSessionEnvelope({
    ...envelope.session,
    account,
  }, storage, savedAt);
}

export async function registerAccount(
  input: AccountRegisterInput,
  options: AccountApiOptions = {}
): Promise<AccountSessionEnvelope> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const endpoint = resolveEndpoint('/api/auth/register', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      password: input.password,
      inviteCode: normalizeOptional(input.inviteCode),
    }),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw responseError(body, `Account registration failed with HTTP ${response.status}`);
  }
  if (!isRecord(body) || body.ok !== true || !isAccountSession(body.session)) {
    throw new Error('Account registration response was not a HarbourMesh session');
  }

  return saveSessionEnvelope(body.session, storage);
}

export async function loginAccount(
  input: AccountLoginInput,
  options: AccountApiOptions = {}
): Promise<AccountSessionEnvelope> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const endpoint = resolveEndpoint('/api/auth/login', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
    }),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw responseError(body, `Account login failed with HTTP ${response.status}`);
  }
  if (!isRecord(body) || body.ok !== true || !isAccountSession(body.session)) {
    throw new Error('Account login response was not a HarbourMesh session');
  }

  return saveSessionEnvelope(body.session, storage);
}

export async function fetchCurrentAccount(options: AccountApiOptions = {}): Promise<PublicAccount> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const session = getAccountSession(storage);
  if (!session) throw new Error('account_session_required');

  const endpoint = resolveEndpoint('/api/auth/me', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.session.accessToken}`,
    },
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAccountSession(storage);
    throw responseError(body, `Current account request failed with HTTP ${response.status}`);
  }
  if (!isRecord(body) || body.ok !== true || !isPublicAccount(body.account)) {
    throw new Error('Current account response was not a HarbourMesh account');
  }

  return body.account;
}

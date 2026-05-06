export const PILOT_API_CREDENTIALS_STORAGE_KEY = 'harbormesh-pilot-api';

export type PilotApiCredentials = {
  schemaVersion: 'harbourmesh.pilot-api-credentials.v1';
  apiKey?: string;
  operatorId?: string;
  reviewSessionToken?: string;
  reviewSessionIssuedAt?: string;
  reviewSessionExpiresAt?: string;
  reviewSessionOperatorId?: string;
  reviewSessionKeyId?: string;
  savedAt: string;
};

export type PilotOperatorSession = {
  accessToken: string;
  tokenType: 'Bearer';
  operatorId: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export type RequestPilotOperatorSessionOptions = {
  apiBaseUrl?: string;
  apiKey?: string;
  operatorId?: string;
  ttlSeconds?: number;
  fetchImpl?: typeof fetch;
  storage?: StorageLike | null;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalSecret(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeOptionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function mergeReviewSession(
  credentials: PilotApiCredentials,
  existingCredentials: PilotApiCredentials | null
): PilotApiCredentials {
  return {
    ...credentials,
    reviewSessionToken: existingCredentials?.reviewSessionToken,
    reviewSessionIssuedAt: existingCredentials?.reviewSessionIssuedAt,
    reviewSessionExpiresAt: existingCredentials?.reviewSessionExpiresAt,
    reviewSessionOperatorId: existingCredentials?.reviewSessionOperatorId,
    reviewSessionKeyId: existingCredentials?.reviewSessionKeyId,
  };
}

function shouldPersistCredentials(credentials: PilotApiCredentials): boolean {
  return Boolean(
    credentials.apiKey ||
    credentials.operatorId ||
    credentials.reviewSessionToken
  );
}

function isPilotOperatorSession(value: unknown): value is PilotOperatorSession {
  const session = value as Partial<PilotOperatorSession>;
  return (
    typeof session.accessToken === 'string' &&
    session.accessToken.startsWith('hm_session_v1.') &&
    session.tokenType === 'Bearer' &&
    typeof session.operatorId === 'string' &&
    session.operatorId.trim().length > 0 &&
    Array.isArray(session.scopes) &&
    session.scopes.includes('review') &&
    typeof session.issuedAt === 'string' &&
    Number.isFinite(Date.parse(session.issuedAt)) &&
    typeof session.expiresAt === 'string' &&
    Number.isFinite(Date.parse(session.expiresAt)) &&
    typeof session.keyId === 'string' &&
    session.keyId.trim().length > 0
  );
}

export function getPilotApiCredentials(
  storage: StorageLike | null = getDefaultStorage()
): PilotApiCredentials | null {
  const rawCredentials = storage?.getItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
  if (!rawCredentials) return null;

  try {
    const parsed = JSON.parse(rawCredentials) as unknown;
    if (!isRecord(parsed) || parsed.schemaVersion !== 'harbourmesh.pilot-api-credentials.v1') return null;

    return {
      schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
      apiKey: typeof parsed.apiKey === 'string' ? normalizeOptionalSecret(parsed.apiKey) : undefined,
      operatorId: typeof parsed.operatorId === 'string' ? normalizeOptionalSecret(parsed.operatorId) : undefined,
      reviewSessionToken: typeof parsed.reviewSessionToken === 'string' ? normalizeOptionalSecret(parsed.reviewSessionToken) : undefined,
      reviewSessionIssuedAt: normalizeOptionalIsoDate(parsed.reviewSessionIssuedAt),
      reviewSessionExpiresAt: normalizeOptionalIsoDate(parsed.reviewSessionExpiresAt),
      reviewSessionOperatorId: typeof parsed.reviewSessionOperatorId === 'string' ? normalizeOptionalSecret(parsed.reviewSessionOperatorId) : undefined,
      reviewSessionKeyId: typeof parsed.reviewSessionKeyId === 'string' ? normalizeOptionalSecret(parsed.reviewSessionKeyId) : undefined,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function savePilotApiCredentials(
  input: { apiKey?: string; operatorId?: string },
  storage: StorageLike | null = getDefaultStorage(),
  savedAt = new Date().toISOString()
): PilotApiCredentials | null {
  if (!storage) return null;
  const existingCredentials = getPilotApiCredentials(storage);
  const apiKey = normalizeOptionalSecret(input.apiKey);
  const operatorId = normalizeOptionalSecret(input.operatorId);

  if (!apiKey && !operatorId) {
    storage.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
    return null;
  }

  const credentials = mergeReviewSession({
    schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
    apiKey,
    operatorId,
    savedAt,
  }, existingCredentials);

  if (!shouldPersistCredentials(credentials)) {
    storage.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
    return null;
  }

  storage.setItem(PILOT_API_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  return credentials;
}

export function clearPilotApiCredentials(storage: StorageLike | null = getDefaultStorage()): void {
  storage?.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
}

export function savePilotReviewSession(
  session: PilotOperatorSession,
  storage: StorageLike | null = getDefaultStorage(),
  savedAt = new Date().toISOString()
): PilotApiCredentials | null {
  if (!storage) return null;
  const existingCredentials = getPilotApiCredentials(storage);
  const credentials: PilotApiCredentials = {
    schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
    apiKey: existingCredentials?.apiKey,
    operatorId: normalizeOptionalSecret(session.operatorId) ?? existingCredentials?.operatorId,
    reviewSessionToken: normalizeOptionalSecret(session.accessToken),
    reviewSessionIssuedAt: normalizeOptionalIsoDate(session.issuedAt),
    reviewSessionExpiresAt: normalizeOptionalIsoDate(session.expiresAt),
    reviewSessionOperatorId: normalizeOptionalSecret(session.operatorId),
    reviewSessionKeyId: normalizeOptionalSecret(session.keyId),
    savedAt,
  };

  if (!shouldPersistCredentials(credentials)) {
    storage.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
    return null;
  }

  storage.setItem(PILOT_API_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  return credentials;
}

export function clearPilotReviewSession(
  storage: StorageLike | null = getDefaultStorage(),
  savedAt = new Date().toISOString()
): PilotApiCredentials | null {
  if (!storage) return null;
  const existingCredentials = getPilotApiCredentials(storage);
  if (!existingCredentials) return null;

  const credentials: PilotApiCredentials = {
    schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
    apiKey: existingCredentials.apiKey,
    operatorId: existingCredentials.operatorId,
    savedAt,
  };

  if (!shouldPersistCredentials(credentials)) {
    storage.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
    return null;
  }

  storage.setItem(PILOT_API_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  return credentials;
}

export function resolvePilotApiKey(
  explicitApiKey?: string,
  storage: StorageLike | null = getDefaultStorage()
): string | undefined {
  return normalizeOptionalSecret(
    explicitApiKey ?? getPilotApiCredentials(storage)?.apiKey ?? import.meta.env.VITE_HARBOURMESH_API_KEY
  );
}

export function resolvePilotOperatorId(
  explicitOperatorId?: string,
  storage: StorageLike | null = getDefaultStorage()
): string | undefined {
  return normalizeOptionalSecret(explicitOperatorId ?? getPilotApiCredentials(storage)?.operatorId);
}

export function isPilotReviewSessionFresh(
  credentials: PilotApiCredentials | null,
  now = new Date()
): boolean {
  const expiresAt = credentials?.reviewSessionExpiresAt;
  if (!credentials?.reviewSessionToken || !expiresAt) return false;

  return Date.parse(expiresAt) > now.getTime();
}

export function resolvePilotReviewCredential(
  explicitApiKey?: string,
  storage: StorageLike | null = getDefaultStorage(),
  now = new Date()
): string | undefined {
  const explicitCredential = normalizeOptionalSecret(explicitApiKey);
  if (explicitCredential) return explicitCredential;

  const credentials = getPilotApiCredentials(storage);
  if (isPilotReviewSessionFresh(credentials, now)) return credentials?.reviewSessionToken;

  return normalizeOptionalSecret(credentials?.apiKey ?? import.meta.env.VITE_HARBOURMESH_API_KEY);
}

export async function requestPilotOperatorSession(
  options: RequestPilotOperatorSessionOptions = {}
): Promise<PilotOperatorSession> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = resolvePilotApiKey(options.apiKey, options.storage);
  const endpoint = resolveEndpoint('/api/auth/operator-session', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const payload = {
    ...(normalizeOptionalSecret(options.operatorId) ? { operatorId: normalizeOptionalSecret(options.operatorId) } : {}),
    ...(Number.isFinite(options.ttlSeconds) && options.ttlSeconds && options.ttlSeconds > 0
      ? { ttlSeconds: Math.floor(options.ttlSeconds) }
      : {}),
  };
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-HarbourMesh-API-Key': apiKey } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (body && typeof body === 'object' && 'error' in body) {
      throw new Error(String(body.error));
    }

    throw new Error(response.statusText || `Operator session request failed with HTTP ${response.status}`);
  }

  const responseBody = body as Partial<{ ok: true; session: unknown }>;
  if (responseBody.ok !== true || !isPilotOperatorSession(responseBody.session)) {
    throw new Error('Operator session request returned an invalid response');
  }

  return responseBody.session;
}

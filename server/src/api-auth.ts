import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const HARBOURMESH_API_KEY_HEADER = 'x-harbourmesh-api-key';
const OPERATOR_SESSION_PREFIX = 'hm_session_v1';
const DEFAULT_OPERATOR_SESSION_TTL_SECONDS = 15 * 60;

export type ApiAccessScope = 'write' | 'review';

const ALL_API_SCOPES: ApiAccessScope[] = ['write', 'review'];

export type ScopedApiKey = {
  key?: string;
  keySha256?: string;
  scopes: ReadonlySet<ApiAccessScope>;
  operatorId?: string;
};

export type ApiAuthConfig = {
  keys: readonly ScopedApiKey[];
  required: boolean;
  sessionSigningKey?: string;
  sessionSigningKeyId: string;
  sessionTtlSeconds: number;
};

export type OperatorApiKey = {
  key: string;
  operatorId: string;
};

export type OperatorSessionToken = {
  accessToken: string;
  tokenType: 'Bearer';
  operatorId: string;
  scopes: ApiAccessScope[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

type OperatorSessionPayload = {
  schemaVersion: 'harbourmesh.operator-session.v1';
  operatorId: string;
  scopes: ApiAccessScope[];
  issuedAt: string;
  expiresAt: string;
  keyId: string;
};

export function parseApiKeys(...values: Array<string | undefined>): string[] {
  return [
    ...new Set(
      values
        .flatMap((value) => (value ?? '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
}

export function hashApiKeyForConfig(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function parseApiKeySha256Hashes(...values: Array<string | undefined>): string[] {
  return parseApiKeys(...values)
    .map((value) => value.toLowerCase())
    .filter((value) => /^[a-f0-9]{64}$/.test(value));
}

export function parseOperatorApiKeys(...values: Array<string | undefined>): OperatorApiKey[] {
  const operators = new Map<string, OperatorApiKey>();

  for (const value of values) {
    for (const entry of (value ?? '').split(',')) {
      const [operatorId, ...keyParts] = entry.split(':');
      const key = keyParts.join(':').trim();
      const normalizedOperatorId = operatorId?.trim();
      if (!normalizedOperatorId || !key) continue;
      operators.set(key, {
        key,
        operatorId: normalizedOperatorId,
      });
    }
  }

  return [...operators.values()];
}

export function parseOperatorApiKeySha256Hashes(...values: Array<string | undefined>): OperatorApiKey[] {
  return parseOperatorApiKeys(...values)
    .map((operatorKey) => ({
      ...operatorKey,
      key: operatorKey.key.toLowerCase(),
    }))
    .filter((operatorKey) => /^[a-f0-9]{64}$/.test(operatorKey.key));
}

export function createApiAuthConfig(config: {
  keys?: readonly string[];
  keySha256Hashes?: readonly string[];
  writeKeys?: readonly string[];
  writeKeySha256Hashes?: readonly string[];
  reviewKeys?: readonly string[];
  reviewKeySha256Hashes?: readonly string[];
  reviewOperatorKeys?: readonly OperatorApiKey[];
  reviewOperatorKeySha256Hashes?: readonly OperatorApiKey[];
  sessionSigningKey?: string;
  sessionSigningKeyId?: string;
  sessionTtlSeconds?: number;
  required?: boolean;
}): ApiAuthConfig {
  const scopedKeys = new Map<string, { key?: string; keySha256?: string; scopes: Set<ApiAccessScope>; operatorId?: string }>();

  function addKey(
    key: string,
    scopes: readonly ApiAccessScope[],
    operatorId?: string,
    storageKind: 'plain' | 'sha256' = 'plain'
  ) {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const credentialId = `${storageKind}:${storageKind === 'sha256' ? normalizedKey.toLowerCase() : normalizedKey}`;
    const existing = scopedKeys.get(credentialId) ?? { scopes: new Set<ApiAccessScope>() };
    if (storageKind === 'sha256') {
      existing.keySha256 = normalizedKey.toLowerCase();
    } else {
      existing.key = normalizedKey;
    }
    for (const scope of scopes) existing.scopes.add(scope);
    if (operatorId) existing.operatorId = operatorId;
    scopedKeys.set(credentialId, existing);
  }

  function addKeys(keys: readonly string[] | undefined, scopes: readonly ApiAccessScope[]) {
    for (const rawKey of keys ?? []) {
      addKey(rawKey, scopes);
    }
  }

  function addKeyHashes(keys: readonly string[] | undefined, scopes: readonly ApiAccessScope[]) {
    for (const rawKey of keys ?? []) {
      addKey(rawKey, scopes, undefined, 'sha256');
    }
  }

  addKeys(config.keys, ALL_API_SCOPES);
  addKeyHashes(config.keySha256Hashes, ALL_API_SCOPES);
  addKeys(config.writeKeys, ['write']);
  addKeyHashes(config.writeKeySha256Hashes, ['write']);
  addKeys(config.reviewKeys, ['review']);
  addKeyHashes(config.reviewKeySha256Hashes, ['review']);
  for (const operatorKey of config.reviewOperatorKeys ?? []) {
    addKey(operatorKey.key, ['review'], operatorKey.operatorId);
  }
  for (const operatorKey of config.reviewOperatorKeySha256Hashes ?? []) {
    addKey(operatorKey.key, ['review'], operatorKey.operatorId, 'sha256');
  }

  return {
    keys: [...scopedKeys.values()].map((config) => ({
      key: config.key,
      keySha256: config.keySha256,
      scopes: config.scopes,
      operatorId: config.operatorId,
    })),
    required: config.required ?? false,
    sessionSigningKey: config.sessionSigningKey?.trim() || undefined,
    sessionSigningKeyId: config.sessionSigningKeyId?.trim() || 'harbourmesh-operator-session-key',
    sessionTtlSeconds: Number.isFinite(config.sessionTtlSeconds) && config.sessionTtlSeconds && config.sessionTtlSeconds > 0
      ? Math.floor(config.sessionTtlSeconds)
      : DEFAULT_OPERATOR_SESSION_TTL_SECONDS,
  };
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function extractApiKey(request: FastifyRequest): string | undefined {
  const headerKey = normalizeHeaderValue(request.headers[HARBOURMESH_API_KEY_HEADER]);
  if (headerKey) return headerKey.trim();

  const authorization = normalizeHeaderValue(request.headers.authorization);
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim();
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
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

function signSessionPayload(unsignedToken: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(unsignedToken).digest('base64url');
}

function isApiAccessScope(value: unknown): value is ApiAccessScope {
  return value === 'write' || value === 'review';
}

function parseSessionPayload(value: unknown): OperatorSessionPayload | null {
  const payload = value as Partial<OperatorSessionPayload>;
  if (
    payload.schemaVersion !== 'harbourmesh.operator-session.v1' ||
    typeof payload.operatorId !== 'string' ||
    !payload.operatorId.trim() ||
    !Array.isArray(payload.scopes) ||
    payload.scopes.length === 0 ||
    !payload.scopes.every(isApiAccessScope) ||
    typeof payload.issuedAt !== 'string' ||
    typeof payload.expiresAt !== 'string' ||
    typeof payload.keyId !== 'string'
  ) {
    return null;
  }

  return {
    schemaVersion: 'harbourmesh.operator-session.v1',
    operatorId: payload.operatorId,
    scopes: [...new Set(payload.scopes)],
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    keyId: payload.keyId,
  };
}

export function createOperatorSessionToken(
  config: ApiAuthConfig,
  input: {
    operatorId: string;
    scopes: ApiAccessScope[];
    ttlSeconds?: number;
    now?: Date;
  }
): OperatorSessionToken | null {
  if (!config.sessionSigningKey) return null;

  const now = input.now ?? new Date();
  const ttlSeconds = Number.isFinite(input.ttlSeconds) && input.ttlSeconds && input.ttlSeconds > 0
    ? Math.min(Math.floor(input.ttlSeconds), config.sessionTtlSeconds)
    : config.sessionTtlSeconds;
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const scopes = [...new Set(input.scopes)].filter(isApiAccessScope);
  const payload: OperatorSessionPayload = {
    schemaVersion: 'harbourmesh.operator-session.v1',
    operatorId: input.operatorId.trim(),
    scopes,
    issuedAt,
    expiresAt,
    keyId: config.sessionSigningKeyId,
  };
  if (!payload.operatorId || payload.scopes.length === 0) return null;

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${OPERATOR_SESSION_PREFIX}.${encodedPayload}`;
  const signature = signSessionPayload(unsignedToken, config.sessionSigningKey);

  return {
    accessToken: `${unsignedToken}.${signature}`,
    tokenType: 'Bearer',
    operatorId: payload.operatorId,
    scopes: payload.scopes,
    issuedAt,
    expiresAt,
    keyId: payload.keyId,
  };
}

function verifyOperatorSessionToken(
  config: ApiAuthConfig,
  token: string,
  scope: ApiAccessScope,
  now = new Date()
): ScopedApiKey | null {
  if (!config.sessionSigningKey || !token.startsWith(`${OPERATOR_SESSION_PREFIX}.`)) return null;

  const [prefix, encodedPayload, signature] = token.split('.');
  if (prefix !== OPERATOR_SESSION_PREFIX || !encodedPayload || !signature) return null;

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
  if (!payload.scopes.includes(scope)) return null;
  if (Date.parse(payload.expiresAt) <= now.getTime()) return null;

  return {
    scopes: new Set(payload.scopes),
    operatorId: payload.operatorId,
  };
}

function isCredentialMatch(configuredKey: ScopedApiKey, apiKey: string): boolean {
  if (configuredKey.key && constantTimeEquals(apiKey, configuredKey.key)) return true;
  if (configuredKey.keySha256) {
    return constantTimeEquals(hashApiKeyForConfig(apiKey), configuredKey.keySha256);
  }

  return false;
}

export function isApiKeyAccepted(
  config: ApiAuthConfig,
  apiKey: string | undefined,
  scope: ApiAccessScope
): boolean {
  const authIsActive = config.required || config.keys.length > 0 || Boolean(config.sessionSigningKey);
  if (!authIsActive) return true;
  if (!apiKey) return false;

  if (verifyOperatorSessionToken(config, apiKey, scope)) return true;
  if (config.keys.length === 0) return false;

  return config.keys.some((configuredKey) => (
    configuredKey.scopes.has(scope) && isCredentialMatch(configuredKey, apiKey)
  ));
}

export function getAcceptedApiKey(
  config: ApiAuthConfig,
  apiKey: string | undefined,
  scope: ApiAccessScope
): ScopedApiKey | null {
  const authIsActive = config.required || config.keys.length > 0 || Boolean(config.sessionSigningKey);
  if (!authIsActive) return null;
  if (!apiKey) return null;

  const sessionCredential = verifyOperatorSessionToken(config, apiKey, scope);
  if (sessionCredential) return sessionCredential;
  if (config.keys.length === 0) return null;

  return config.keys.find((configuredKey) => (
    configuredKey.scopes.has(scope) && isCredentialMatch(configuredKey, apiKey)
  )) ?? null;
}

export function getRequestApiKeyIdentity(
  config: ApiAuthConfig,
  request: FastifyRequest,
  scope: ApiAccessScope
): Pick<ScopedApiKey, 'operatorId'> | null {
  return getAcceptedApiKey(config, extractApiKey(request), scope);
}

export async function requireApiAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  config: ApiAuthConfig,
  scope: ApiAccessScope = 'write'
): Promise<boolean> {
  const authIsActive = config.required || config.keys.length > 0 || Boolean(config.sessionSigningKey);
  if (!authIsActive) return true;

  if (config.keys.length === 0 && !config.sessionSigningKey) {
    await reply.code(503).send({
      ok: false,
      error: 'api_auth_not_configured',
    });
    return false;
  }

  const apiKey = extractApiKey(request);
  if (!apiKey) {
    await reply
      .code(401)
      .header('WWW-Authenticate', 'Bearer realm="harbourmesh-api"')
      .send({
        ok: false,
        error: 'api_key_required',
      });
    return false;
  }

  if (!isApiKeyAccepted(config, apiKey, scope)) {
    await reply
      .code(403)
      .send({
        ok: false,
        error: 'api_key_scope_required',
        requiredScope: scope,
      });
    return false;
  }

  return true;
}

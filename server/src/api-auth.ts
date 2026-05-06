import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const HARBOURMESH_API_KEY_HEADER = 'x-harbourmesh-api-key';

export type ApiAccessScope = 'write' | 'review';

const ALL_API_SCOPES: ApiAccessScope[] = ['write', 'review'];

export type ScopedApiKey = {
  key: string;
  scopes: ReadonlySet<ApiAccessScope>;
  operatorId?: string;
};

export type ApiAuthConfig = {
  keys: readonly ScopedApiKey[];
  required: boolean;
};

export type OperatorApiKey = {
  key: string;
  operatorId: string;
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

export function createApiAuthConfig(config: {
  keys?: readonly string[];
  writeKeys?: readonly string[];
  reviewKeys?: readonly string[];
  reviewOperatorKeys?: readonly OperatorApiKey[];
  required?: boolean;
}): ApiAuthConfig {
  const scopedKeys = new Map<string, { scopes: Set<ApiAccessScope>; operatorId?: string }>();

  function addKey(key: string, scopes: readonly ApiAccessScope[], operatorId?: string) {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const existing = scopedKeys.get(normalizedKey) ?? { scopes: new Set<ApiAccessScope>() };
    for (const scope of scopes) existing.scopes.add(scope);
    if (operatorId) existing.operatorId = operatorId;
    scopedKeys.set(normalizedKey, existing);
  }

  function addKeys(keys: readonly string[] | undefined, scopes: readonly ApiAccessScope[]) {
    for (const rawKey of keys ?? []) {
      addKey(rawKey, scopes);
    }
  }

  addKeys(config.keys, ALL_API_SCOPES);
  addKeys(config.writeKeys, ['write']);
  addKeys(config.reviewKeys, ['review']);
  for (const operatorKey of config.reviewOperatorKeys ?? []) {
    addKey(operatorKey.key, ['review'], operatorKey.operatorId);
  }

  return {
    keys: [...scopedKeys.entries()].map(([key, config]) => ({
      key,
      scopes: config.scopes,
      operatorId: config.operatorId,
    })),
    required: config.required ?? false,
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

export function isApiKeyAccepted(
  config: ApiAuthConfig,
  apiKey: string | undefined,
  scope: ApiAccessScope
): boolean {
  const authIsActive = config.required || config.keys.length > 0;
  if (!authIsActive) return true;
  if (config.keys.length === 0 || !apiKey) return false;

  return config.keys.some((configuredKey) => (
    configuredKey.scopes.has(scope) && constantTimeEquals(apiKey, configuredKey.key)
  ));
}

export function getAcceptedApiKey(
  config: ApiAuthConfig,
  apiKey: string | undefined,
  scope: ApiAccessScope
): ScopedApiKey | null {
  const authIsActive = config.required || config.keys.length > 0;
  if (!authIsActive) return null;
  if (config.keys.length === 0 || !apiKey) return null;

  return config.keys.find((configuredKey) => (
    configuredKey.scopes.has(scope) && constantTimeEquals(apiKey, configuredKey.key)
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
  const authIsActive = config.required || config.keys.length > 0;
  if (!authIsActive) return true;

  if (config.keys.length === 0) {
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

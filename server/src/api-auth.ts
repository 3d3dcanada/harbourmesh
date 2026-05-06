import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const HARBOURMESH_API_KEY_HEADER = 'x-harbourmesh-api-key';

export type ApiAuthConfig = {
  keys: readonly string[];
  required: boolean;
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

export function createApiAuthConfig(config: {
  keys?: readonly string[];
  required?: boolean;
}): ApiAuthConfig {
  return {
    keys: [...new Set((config.keys ?? []).map((key) => key.trim()).filter(Boolean))],
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

export function isApiKeyAccepted(config: ApiAuthConfig, apiKey: string | undefined): boolean {
  const authIsActive = config.required || config.keys.length > 0;
  if (!authIsActive) return true;
  if (config.keys.length === 0 || !apiKey) return false;

  return config.keys.some((configuredKey) => constantTimeEquals(apiKey, configuredKey));
}

export async function requireApiAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  config: ApiAuthConfig
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

  if (!isApiKeyAccepted(config, extractApiKey(request))) {
    await reply
      .code(401)
      .header('WWW-Authenticate', 'Bearer realm="harbourmesh-api"')
      .send({
        ok: false,
        error: 'api_key_required',
      });
    return false;
  }

  return true;
}

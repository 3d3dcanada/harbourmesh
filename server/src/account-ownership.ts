import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  ACCOUNT_SESSION_PREFIX,
  verifyAccountSessionToken,
  type AccountAuthConfig,
  type AccountRole,
  type UserAccountRepository,
} from './account-auth.js';

export const HARBOURMESH_ACCOUNT_SESSION_HEADER = 'x-harbourmesh-account-session';

export type AccountOwnershipContext = {
  accountId: string;
  roles: AccountRole[];
};

export type AccountOwnerMetadata = {
  ownerAccountId?: string;
  ownerAccountRoles?: AccountRole[];
};

export type AccountReviewerMetadata = {
  reviewedByAccountId?: string;
  reviewedByAccountRoles?: AccountRole[];
};

export type AccountPublisherMetadata = {
  publishedByAccountId?: string;
  publishedByAccountRoles?: AccountRole[];
};

type AccountOwnershipResolution = {
  ok: true;
  context: AccountOwnershipContext | null;
} | {
  ok: false;
  statusCode: 401 | 403 | 503;
  error: 'account_session_signing_not_configured' | 'invalid_account_session' | 'account_not_available';
};

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function extractBearerToken(request: FastifyRequest): string | undefined {
  const authorization = normalizeHeaderValue(request.headers.authorization);
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
}

function extractAccountSessionTokens(request: FastifyRequest): string[] {
  const headerToken = normalizeHeaderValue(request.headers[HARBOURMESH_ACCOUNT_SESSION_HEADER])?.trim();
  const bearerToken = extractBearerToken(request);
  const accountBearerToken = bearerToken?.startsWith(`${ACCOUNT_SESSION_PREFIX}.`) ? bearerToken : undefined;

  return [...new Set([headerToken, accountBearerToken].filter(Boolean) as string[])];
}

export function toOwnerMetadata(context: AccountOwnershipContext | null | undefined): AccountOwnerMetadata {
  return context ? {
    ownerAccountId: context.accountId,
    ownerAccountRoles: [...context.roles],
  } : {};
}

export function toReviewerMetadata(context: AccountOwnershipContext | null | undefined): AccountReviewerMetadata {
  return context ? {
    reviewedByAccountId: context.accountId,
    reviewedByAccountRoles: [...context.roles],
  } : {};
}

export function toPublisherMetadata(context: AccountOwnershipContext | null | undefined): AccountPublisherMetadata {
  return context ? {
    publishedByAccountId: context.accountId,
    publishedByAccountRoles: [...context.roles],
  } : {};
}

export async function resolveOptionalAccountOwnershipContext(
  request: FastifyRequest,
  accountAuth: AccountAuthConfig,
  userAccountRepository: UserAccountRepository
): Promise<AccountOwnershipResolution> {
  const tokens = extractAccountSessionTokens(request);
  if (tokens.length === 0) return { ok: true, context: null };
  if (tokens.length > 1 || !accountAuth.sessionSigningKey) {
    return {
      ok: false,
      statusCode: tokens.length > 1 ? 403 : 503,
      error: tokens.length > 1 ? 'invalid_account_session' : 'account_session_signing_not_configured',
    };
  }

  const session = verifyAccountSessionToken(accountAuth, tokens[0]);
  if (!session) {
    return {
      ok: false,
      statusCode: 403,
      error: 'invalid_account_session',
    };
  }

  const account = await userAccountRepository.getAccountById(session.accountId);
  if (!account || account.status !== 'active') {
    return {
      ok: false,
      statusCode: 401,
      error: 'account_not_available',
    };
  }

  return {
    ok: true,
    context: {
      accountId: account.id,
      roles: [...account.roles],
    },
  };
}

export async function sendAccountOwnershipError(
  reply: FastifyReply,
  resolution: Extract<AccountOwnershipResolution, { ok: false }>
): Promise<FastifyReply> {
  return reply.code(resolution.statusCode).send({
    ok: false,
    error: resolution.error,
  });
}

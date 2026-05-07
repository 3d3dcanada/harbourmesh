import {
  ACCOUNT_SESSION_HEADER,
  buildAccountSessionHeaders,
  clearAccountSession,
  type StorageLike,
} from './account-session';

export type AccountCommunityContributionKind = 'sounding' | 'hazard' | 'observation' | 'aggregate_release';

export type AccountCommunityContributionItem = {
  id: string;
  kind: AccountCommunityContributionKind;
  region?: string;
  status?: string;
  reviewStatus?: string;
  createdAt: string;
};

export type AccountCommunityContributionSummary = {
  totalRecords: number;
  soundings: number;
  hazards: number;
  observations: number;
  aggregateReleases: number;
  byReviewStatus: Record<string, number>;
};

export type AccountCommunityContributions = {
  ok: true;
  accountId: string;
  generatedAt: string;
  summary: AccountCommunityContributionSummary;
  recentItems: AccountCommunityContributionItem[];
};

export type FetchAccountCommunityContributionsOptions = {
  apiBaseUrl?: string;
  accountAccessToken?: string;
  storage?: StorageLike | null;
  fetchImpl?: typeof fetch;
};

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

function isContributionKind(value: unknown): value is AccountCommunityContributionKind {
  return value === 'sounding' || value === 'hazard' || value === 'observation' || value === 'aggregate_release';
}

function isReviewStatusCounts(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((count) => typeof count === 'number');
}

function isContributionSummary(value: unknown): value is AccountCommunityContributionSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.totalRecords === 'number' &&
    typeof value.soundings === 'number' &&
    typeof value.hazards === 'number' &&
    typeof value.observations === 'number' &&
    typeof value.aggregateReleases === 'number' &&
    isReviewStatusCounts(value.byReviewStatus)
  );
}

function isContributionItem(value: unknown): value is AccountCommunityContributionItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    isContributionKind(value.kind) &&
    (value.region === undefined || typeof value.region === 'string') &&
    (value.status === undefined || typeof value.status === 'string') &&
    (value.reviewStatus === undefined || typeof value.reviewStatus === 'string') &&
    typeof value.createdAt === 'string'
  );
}

function isAccountCommunityContributions(value: unknown): value is AccountCommunityContributions {
  if (!isRecord(value)) return false;
  return (
    value.ok === true &&
    typeof value.accountId === 'string' &&
    typeof value.generatedAt === 'string' &&
    isContributionSummary(value.summary) &&
    Array.isArray(value.recentItems) &&
    value.recentItems.every(isContributionItem)
  );
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null) as Promise<unknown>;
}

function responseError(body: unknown, fallback: string): Error {
  if (isRecord(body) && typeof body.error === 'string') return new Error(body.error);
  return new Error(fallback);
}

export async function fetchAccountCommunityContributions(
  options: FetchAccountCommunityContributionsOptions = {}
): Promise<AccountCommunityContributions> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const headers = buildAccountSessionHeaders(options.accountAccessToken, storage);
  if (!headers[ACCOUNT_SESSION_HEADER]) throw new Error('account_session_required');

  const endpoint = resolveEndpoint(
    '/api/account/community/contributions',
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAccountSession(storage);
    throw responseError(body, `Account contribution request failed with HTTP ${response.status}`);
  }
  if (!isAccountCommunityContributions(body)) {
    throw new Error('Account contribution response was not a HarbourMesh contribution summary');
  }

  return body;
}

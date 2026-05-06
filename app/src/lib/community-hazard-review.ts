import { buildAccountSessionHeaders, type StorageLike } from './account-session';
import { resolvePilotReviewCredential } from './pilot-api-credentials';

export type CommunityHazardReviewStatus = 'pending' | 'accepted' | 'rejected';

export type CommunityHazardReviewRecord = {
  id: string;
  vesselId: string;
  sourceDeviceId?: string;
  type: 'traffic' | 'weather' | 'obstruction' | 'shoal' | 'debris' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  position?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
    cog?: number;
    sog?: number;
    source: 'gps' | 'ais' | 'manual' | 'estimated';
    timestamp: string;
  };
  reportedAt: string;
  sharingState: 'shareable_no_position' | 'shareable_blurred' | 'shareable_full';
  consentCapturedAt: string;
  batchId: string;
  storedAt: string;
  region: string;
  reviewStatus: CommunityHazardReviewStatus;
  publicOverlayEligible: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

export type CommunityHazardReviewQueue = {
  hazards: CommunityHazardReviewRecord[];
};

export type CommunityHazardReviewHistoryEntry = {
  hazardId: string;
  status: Exclude<CommunityHazardReviewStatus, 'pending'>;
  reviewedBy: string;
  reviewedAt: string;
  note?: string;
};

export type CommunityHazardReviewHistory = {
  reviews: CommunityHazardReviewHistoryEntry[];
};

export type CommunityHazardReviewReceipt = {
  ok: true;
  hazardId: string;
  status: Exclude<CommunityHazardReviewStatus, 'pending'>;
  publicOverlayEligible: boolean;
  reviewedAt: string;
};

export type CommunityHazardReviewOptions = {
  apiBaseUrl?: string;
  apiKey?: string;
  accountAccessToken?: string;
  accountSessionStorage?: StorageLike | null;
  fetchImpl?: typeof fetch;
};

export type ReviewCommunityHazardInput = {
  hazardId: string;
  status: Exclude<CommunityHazardReviewStatus, 'pending'>;
  reviewedBy: string;
  note?: string;
};

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function resolveApiKey(apiKey?: string): string | undefined {
  return resolvePilotReviewCredential(apiKey);
}

function buildJsonHeaders(
  credential?: string,
  accountAccessToken?: string,
  accountSessionStorage?: StorageLike | null
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(credential?.startsWith('hm_session_v1.')
      ? { Authorization: `Bearer ${credential}` }
      : credential
        ? { 'X-HarbourMesh-API-Key': credential }
        : {}),
    ...buildAccountSessionHeaders(accountAccessToken, accountSessionStorage),
  };
}

function isReviewQueue(value: unknown): value is CommunityHazardReviewQueue {
  const queue = value as Partial<CommunityHazardReviewQueue>;
  return Array.isArray(queue.hazards);
}

function isReviewHistory(value: unknown): value is CommunityHazardReviewHistory {
  const history = value as Partial<CommunityHazardReviewHistory>;
  return (
    Array.isArray(history.reviews) &&
    history.reviews.every((review) => (
      typeof review.hazardId === 'string' &&
      (review.status === 'accepted' || review.status === 'rejected') &&
      typeof review.reviewedBy === 'string' &&
      typeof review.reviewedAt === 'string'
    ))
  );
}

function isReviewReceipt(value: unknown): value is CommunityHazardReviewReceipt {
  const receipt = value as Partial<CommunityHazardReviewReceipt>;
  return (
    receipt.ok === true &&
    typeof receipt.hazardId === 'string' &&
    (receipt.status === 'accepted' || receipt.status === 'rejected') &&
    typeof receipt.publicOverlayEligible === 'boolean' &&
    typeof receipt.reviewedAt === 'string'
  );
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function getApiError(body: unknown, response: Response, fallback: string): Error {
  if (body && typeof body === 'object' && 'error' in body) {
    return new Error(String(body.error));
  }

  return new Error(response.statusText || `${fallback} with HTTP ${response.status}`);
}

export async function listCommunityHazardsForReview(
  options: CommunityHazardReviewOptions = {}
): Promise<CommunityHazardReviewQueue> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    '/api/community/hazards/review',
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Hazard review queue failed');
  }

  if (!isReviewQueue(body)) {
    throw new Error('Hazard review queue returned an invalid response');
  }

  return body;
}

export async function listCommunityHazardReviews(
  options: CommunityHazardReviewOptions = {}
): Promise<CommunityHazardReviewHistory> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    '/api/community/hazards/reviews',
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Hazard review history failed');
  }

  if (!isReviewHistory(body)) {
    throw new Error('Hazard review history returned an invalid response');
  }

  return body;
}

export async function reviewCommunityHazard(
  input: ReviewCommunityHazardInput,
  options: CommunityHazardReviewOptions = {}
): Promise<CommunityHazardReviewReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    `/api/community/hazards/${encodeURIComponent(input.hazardId)}/review`,
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
    body: JSON.stringify({
      status: input.status,
      reviewedBy: input.reviewedBy,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    }),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Hazard review failed');
  }

  if (!isReviewReceipt(body)) {
    throw new Error('Hazard review returned an invalid receipt');
  }

  if (body.hazardId !== input.hazardId) {
    throw new Error('Hazard review receipt id mismatch');
  }

  return body;
}

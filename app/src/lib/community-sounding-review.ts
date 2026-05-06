import { buildAccountSessionHeaders, type StorageLike } from './account-session';
import { resolvePilotReviewCredential } from './pilot-api-credentials';
import type { DepthReference, SoundingOffsets, SoundingQuality, SoundingSourceProtocol } from './community-soundings';

export type CommunitySoundingReviewStatus = 'unreviewed' | 'accepted' | 'rejected';

export type CommunitySoundingReviewRecord = {
  id: string;
  vesselId: string;
  sourceDeviceId: string;
  sourceProtocol: SoundingSourceProtocol;
  rawMessageId: string;
  timestamp: string;
  receivedAt: string;
  latitude: number;
  longitude: number;
  sharingState: 'shareable_blurred' | 'shareable_full';
  consentCapturedAt: string;
  rawDepthMeters: number;
  depthMeters: number;
  depthReference: DepthReference;
  tideCorrectionApplied: boolean;
  waterLevelCorrectionApplied: boolean;
  offsets: SoundingOffsets;
  quality: SoundingQuality;
  batchId: string;
  storedAt: string;
  region: string;
  reviewStatus: CommunitySoundingReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewReason?: CommunitySoundingReviewReason;
  reviewNote?: string;
};

export type CommunitySoundingReviewReason =
  | 'outlier'
  | 'duplicate'
  | 'bad_position'
  | 'bad_offset'
  | 'sensor_fault'
  | 'other';

export type CommunitySoundingReviewQueue = {
  soundings: CommunitySoundingReviewRecord[];
};

export type CommunitySoundingReviewHistoryEntry = {
  soundingId: string;
  status: Exclude<CommunitySoundingReviewStatus, 'unreviewed'>;
  reviewedBy: string;
  reviewedAt: string;
  reason?: CommunitySoundingReviewReason;
  note?: string;
};

export type CommunitySoundingReviewHistory = {
  reviews: CommunitySoundingReviewHistoryEntry[];
};

export type CommunitySoundingReviewReceipt = {
  ok: true;
  soundingId: string;
  status: Exclude<CommunitySoundingReviewStatus, 'unreviewed'>;
  includedInAggregates: boolean;
  reviewedAt: string;
};

export type CommunitySoundingReviewOptions = {
  apiBaseUrl?: string;
  apiKey?: string;
  accountAccessToken?: string;
  accountSessionStorage?: StorageLike | null;
  fetchImpl?: typeof fetch;
};

export type ReviewCommunitySoundingInput = {
  soundingId: string;
  status: Exclude<CommunitySoundingReviewStatus, 'unreviewed'>;
  reviewedBy: string;
  reason?: CommunitySoundingReviewReason;
  note?: string;
};

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
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

function isReviewStatus(value: unknown): value is CommunitySoundingReviewStatus {
  return value === 'unreviewed' || value === 'accepted' || value === 'rejected';
}

function isSoundingReviewQueue(value: unknown): value is CommunitySoundingReviewQueue {
  const queue = value as Partial<CommunitySoundingReviewQueue>;
  return (
    Array.isArray(queue.soundings) &&
    queue.soundings.every((sounding) => (
      typeof sounding.id === 'string' &&
      typeof sounding.depthMeters === 'number' &&
      typeof sounding.latitude === 'number' &&
      typeof sounding.longitude === 'number' &&
      isReviewStatus(sounding.reviewStatus)
    ))
  );
}

function isReviewHistory(value: unknown): value is CommunitySoundingReviewHistory {
  const history = value as Partial<CommunitySoundingReviewHistory>;
  return (
    Array.isArray(history.reviews) &&
    history.reviews.every((review) => (
      typeof review.soundingId === 'string' &&
      (review.status === 'accepted' || review.status === 'rejected') &&
      typeof review.reviewedBy === 'string' &&
      typeof review.reviewedAt === 'string'
    ))
  );
}

function isReviewReceipt(value: unknown): value is CommunitySoundingReviewReceipt {
  const receipt = value as Partial<CommunitySoundingReviewReceipt>;
  return (
    receipt.ok === true &&
    typeof receipt.soundingId === 'string' &&
    (receipt.status === 'accepted' || receipt.status === 'rejected') &&
    typeof receipt.includedInAggregates === 'boolean' &&
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

export async function listCommunitySoundingsForReview(
  options: CommunitySoundingReviewOptions = {}
): Promise<CommunitySoundingReviewQueue> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    '/api/community/soundings/review',
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: buildJsonHeaders(resolvePilotReviewCredential(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Sounding review queue failed');
  }

  if (!isSoundingReviewQueue(body)) {
    throw new Error('Sounding review queue returned an invalid response');
  }

  return body;
}

export async function listCommunitySoundingReviews(
  options: CommunitySoundingReviewOptions = {}
): Promise<CommunitySoundingReviewHistory> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    '/api/community/soundings/reviews',
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: buildJsonHeaders(resolvePilotReviewCredential(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Sounding review history failed');
  }

  if (!isReviewHistory(body)) {
    throw new Error('Sounding review history returned an invalid response');
  }

  return body;
}

export async function reviewCommunitySounding(
  input: ReviewCommunitySoundingInput,
  options: CommunitySoundingReviewOptions = {}
): Promise<CommunitySoundingReviewReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(
    `/api/community/soundings/${encodeURIComponent(input.soundingId)}/review`,
    options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL
  );
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(resolvePilotReviewCredential(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
    body: JSON.stringify({
      status: input.status,
      reviewedBy: input.reviewedBy,
      ...(input.reason ? { reason: input.reason } : {}),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    }),
  });
  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw getApiError(body, response, 'Sounding review failed');
  }

  if (!isReviewReceipt(body)) {
    throw new Error('Sounding review returned an invalid receipt');
  }

  if (body.soundingId !== input.soundingId) {
    throw new Error('Sounding review receipt id mismatch');
  }

  return body;
}

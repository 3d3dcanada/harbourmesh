import type { CommunityHazardSyncBatch, CommunityObservationSyncBatch, CommunitySyncBatch } from '@/store';
import { buildAccountSessionHeaders, type StorageLike } from './account-session';
import { resolvePilotApiKey } from './pilot-api-credentials';

export type CommunitySyncReceipt = {
  ok: true;
  receiptId: string;
  batchId: string;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type CommunitySoundingSyncReceipt = CommunitySyncReceipt;
export type CommunityHazardSyncReceipt = CommunitySyncReceipt;
export type CommunityObservationSyncReceipt = CommunitySyncReceipt;

export type UploadCommunitySoundingBatchOptions = {
  apiBaseUrl?: string;
  apiKey?: string;
  accountAccessToken?: string;
  accountSessionStorage?: StorageLike | null;
  fetchImpl?: typeof fetch;
};

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function isReceipt(value: unknown): value is CommunitySyncReceipt {
  const receipt = value as Partial<CommunitySyncReceipt>;
  return (
    receipt.ok === true &&
    typeof receipt.receiptId === 'string' &&
    typeof receipt.batchId === 'string' &&
    typeof receipt.acceptedCount === 'number' &&
    typeof receipt.duplicateCount === 'number' &&
    typeof receipt.storedAt === 'string'
  );
}

function resolveApiKey(apiKey?: string): string | undefined {
  return resolvePilotApiKey(apiKey);
}

function buildJsonHeaders(
  apiKey?: string,
  accountAccessToken?: string,
  accountSessionStorage?: StorageLike | null
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-HarbourMesh-API-Key': apiKey } : {}),
    ...buildAccountSessionHeaders(accountAccessToken, accountSessionStorage),
  };
}

export async function uploadCommunitySoundingBatch(
  batch: CommunitySyncBatch,
  options: UploadCommunitySoundingBatchOptions = {}
): Promise<CommunitySoundingSyncReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(batch.endpoint, options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
    body: JSON.stringify(batch.payload),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community sync failed with HTTP ${response.status}`);
  }

  if (!isReceipt(body)) {
    throw new Error('Community sync returned an invalid receipt');
  }

  if (body.batchId !== batch.id) {
    throw new Error('Community sync receipt batch id mismatch');
  }

  return body;
}

export async function uploadCommunityHazardBatch(
  batch: CommunityHazardSyncBatch,
  options: UploadCommunitySoundingBatchOptions = {}
): Promise<CommunityHazardSyncReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(batch.endpoint, options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
    body: JSON.stringify(batch.payload),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community sync failed with HTTP ${response.status}`);
  }

  if (!isReceipt(body)) {
    throw new Error('Community sync returned an invalid receipt');
  }

  if (body.batchId !== batch.id) {
    throw new Error('Community sync receipt batch id mismatch');
  }

  return body;
}

export async function uploadCommunityObservationBatch(
  batch: CommunityObservationSyncBatch,
  options: UploadCommunitySoundingBatchOptions = {}
): Promise<CommunityObservationSyncReceipt> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint(batch.endpoint, options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: buildJsonHeaders(resolveApiKey(options.apiKey), options.accountAccessToken, options.accountSessionStorage),
    body: JSON.stringify(batch.payload),
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Community sync failed with HTTP ${response.status}`);
  }

  if (!isReceipt(body)) {
    throw new Error('Community sync returned an invalid receipt');
  }

  if (body.batchId !== batch.id) {
    throw new Error('Community sync receipt batch id mismatch');
  }

  return body;
}

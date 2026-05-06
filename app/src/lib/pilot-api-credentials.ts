export const PILOT_API_CREDENTIALS_STORAGE_KEY = 'harbormesh-pilot-api';

export type PilotApiCredentials = {
  schemaVersion: 'harbourmesh.pilot-api-credentials.v1';
  apiKey?: string;
  operatorId?: string;
  savedAt: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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

  const credentials: PilotApiCredentials = {
    schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
    apiKey: normalizeOptionalSecret(input.apiKey),
    operatorId: normalizeOptionalSecret(input.operatorId),
    savedAt,
  };

  if (!credentials.apiKey && !credentials.operatorId) {
    storage.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
    return null;
  }

  storage.setItem(PILOT_API_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));
  return credentials;
}

export function clearPilotApiCredentials(storage: StorageLike | null = getDefaultStorage()): void {
  storage?.removeItem(PILOT_API_CREDENTIALS_STORAGE_KEY);
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

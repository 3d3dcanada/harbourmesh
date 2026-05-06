import { describe, expect, it, vi } from 'vitest';
import {
  PILOT_API_CREDENTIALS_STORAGE_KEY,
  clearPilotApiCredentials,
  getPilotApiCredentials,
  resolvePilotApiKey,
  resolvePilotOperatorId,
  savePilotApiCredentials,
} from './pilot-api-credentials';

function createStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    store,
  };
}

describe('pilot API credentials', () => {
  it('saves trimmed API credentials in the excluded local store', () => {
    const storage = createStorage();

    const saved = savePilotApiCredentials({
      apiKey: '  hm_test_key  ',
      operatorId: ' nb-ops ',
    }, storage, '2026-05-06T13:30:00.000Z');

    expect(saved).toMatchObject({
      apiKey: 'hm_test_key',
      operatorId: 'nb-ops',
      savedAt: '2026-05-06T13:30:00.000Z',
    });
    expect(JSON.parse(storage.store[PILOT_API_CREDENTIALS_STORAGE_KEY])).toMatchObject({
      schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
      apiKey: 'hm_test_key',
      operatorId: 'nb-ops',
    });
  });

  it('resolves explicit values before stored credentials', () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: JSON.stringify({
        schemaVersion: 'harbourmesh.pilot-api-credentials.v1',
        apiKey: 'stored-key',
        operatorId: 'stored-operator',
        savedAt: '2026-05-06T13:30:00.000Z',
      }),
    });

    expect(getPilotApiCredentials(storage)).toMatchObject({
      apiKey: 'stored-key',
      operatorId: 'stored-operator',
    });
    expect(resolvePilotApiKey(undefined, storage)).toBe('stored-key');
    expect(resolvePilotApiKey('explicit-key', storage)).toBe('explicit-key');
    expect(resolvePilotOperatorId(undefined, storage)).toBe('stored-operator');
    expect(resolvePilotOperatorId('explicit-operator', storage)).toBe('explicit-operator');
  });

  it('clears empty or explicitly cleared credential storage', () => {
    const storage = createStorage({
      [PILOT_API_CREDENTIALS_STORAGE_KEY]: 'bad-json',
    });

    expect(getPilotApiCredentials(storage)).toBeNull();
    expect(savePilotApiCredentials({ apiKey: ' ', operatorId: '' }, storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(PILOT_API_CREDENTIALS_STORAGE_KEY);

    savePilotApiCredentials({ apiKey: 'hm_test_key' }, storage);
    clearPilotApiCredentials(storage);
    expect(storage.store).not.toHaveProperty(PILOT_API_CREDENTIALS_STORAGE_KEY);
  });
});

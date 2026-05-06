import { describe, expect, it, vi } from 'vitest';
import {
  buildLocalDataExport,
  importLocalDataExport,
  parseLocalDataExport,
  serializeLocalDataExport,
} from './local-data-portability';

function createStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    store,
  };
}

describe('local data portability', () => {
  it('exports persisted pilot data while excluding AI provider secrets', () => {
    const storage = createStorage({
      'harbormesh-vessel-data': JSON.stringify({ state: { vessels: [{ id: 'vessel-1' }] } }),
      'harbormesh-ai': JSON.stringify({ state: { providers: [{ apiKey: 'secret' }] } }),
    });

    const bundle = buildLocalDataExport(storage, '2026-05-06T12:30:00.000Z');

    expect(bundle).toMatchObject({
      schemaVersion: 'harbourmesh.local-data-export.v1',
      exportedAt: '2026-05-06T12:30:00.000Z',
      excludedStores: ['harbormesh-ai'],
    });
    expect(bundle.stores['harbormesh-vessel-data']).toEqual({ state: { vessels: [{ id: 'vessel-1' }] } });
    expect(bundle.stores).not.toHaveProperty('harbormesh-ai');
  });

  it('round-trips valid exports into portable local stores', () => {
    const source = createStorage({
      'harbormesh-settings': JSON.stringify({ state: { userPreferences: { unitSystem: 'nautical' } } }),
      'harbormesh-logbook': JSON.stringify({ state: { logs: [{ id: 'log-1' }], tasks: [] } }),
    });
    const target = createStorage();

    const parsed = parseLocalDataExport(serializeLocalDataExport(buildLocalDataExport(source)));
    const result = importLocalDataExport(parsed, target);

    expect(result.importedStores).toEqual(['harbormesh-logbook', 'harbormesh-settings']);
    expect(target.store['harbormesh-logbook']).toContain('log-1');
    expect(target.store['harbormesh-settings']).toContain('nautical');
  });

  it('rejects malformed exports and bundles containing excluded AI stores', () => {
    expect(() => parseLocalDataExport(JSON.stringify({ ok: true }))).toThrow('not a HarbourMesh local data export');
    expect(() => parseLocalDataExport(JSON.stringify({
      schemaVersion: 'harbourmesh.local-data-export.v1',
      exportedAt: '2026-05-06T12:30:00.000Z',
      stores: {
        'harbormesh-ai': { state: { providers: [{ apiKey: 'secret' }] } },
      },
      excludedStores: [],
    }))).toThrow('must not include AI provider secrets');
  });
});

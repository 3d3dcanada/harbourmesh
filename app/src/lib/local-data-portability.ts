export const PORTABLE_STORE_KEYS = [
  'harbormesh-app',
  'harbormesh-vessel-data',
  'harbormesh-documents',
  'harbormesh-logbook',
  'harbormesh-navigation-plans',
  'harbormesh-local-chart-library',
  'harbormesh-settings',
  'harbormesh-community-data',
  'harbormesh-fleet',
] as const;

export const EXCLUDED_STORE_KEYS = [
  'harbormesh-ai',
  'harbormesh-pilot-api',
  'harbormesh-account-session',
] as const;

export type PortableStoreKey = typeof PORTABLE_STORE_KEYS[number];

export type LocalDataExportBundle = {
  schemaVersion: 'harbourmesh.local-data-export.v1';
  exportedAt: string;
  stores: Partial<Record<PortableStoreKey, unknown>>;
  excludedStores: typeof EXCLUDED_STORE_KEYS[number][];
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildLocalDataExport(
  storage: StorageLike = window.localStorage,
  exportedAt = new Date().toISOString()
): LocalDataExportBundle {
  const stores: LocalDataExportBundle['stores'] = {};

  for (const key of PORTABLE_STORE_KEYS) {
    const value = storage.getItem(key);
    if (!value) continue;
    stores[key] = JSON.parse(value) as unknown;
  }

  return {
    schemaVersion: 'harbourmesh.local-data-export.v1',
    exportedAt,
    stores,
    excludedStores: [...EXCLUDED_STORE_KEYS],
  };
}

export function serializeLocalDataExport(bundle: LocalDataExportBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function parseLocalDataExport(contents: string): LocalDataExportBundle {
  const parsed = JSON.parse(contents) as unknown;

  if (!isRecord(parsed) || parsed.schemaVersion !== 'harbourmesh.local-data-export.v1') {
    throw new Error('Import file is not a HarbourMesh local data export');
  }

  if (typeof parsed.exportedAt !== 'string' || !isRecord(parsed.stores) || !Array.isArray(parsed.excludedStores)) {
    throw new Error('HarbourMesh local data export is missing required fields');
  }

  for (const key of EXCLUDED_STORE_KEYS) {
    if (key in parsed.stores) {
      throw new Error('HarbourMesh local data export must not include secret stores');
    }
  }

  const stores: LocalDataExportBundle['stores'] = {};
  for (const key of PORTABLE_STORE_KEYS) {
    if (key in parsed.stores) {
      stores[key] = parsed.stores[key];
    }
  }

  return {
    schemaVersion: 'harbourmesh.local-data-export.v1',
    exportedAt: parsed.exportedAt,
    stores,
    excludedStores: [...EXCLUDED_STORE_KEYS],
  };
}

export function importLocalDataExport(
  bundle: LocalDataExportBundle,
  storage: StorageLike = window.localStorage
): { importedStores: PortableStoreKey[]; skippedStores: string[] } {
  const importedStores: PortableStoreKey[] = [];
  const skippedStores = [...EXCLUDED_STORE_KEYS];

  for (const key of PORTABLE_STORE_KEYS) {
    if (!(key in bundle.stores)) continue;
    storage.setItem(key, JSON.stringify(bundle.stores[key]));
    importedStores.push(key);
  }

  return { importedStores, skippedStores };
}

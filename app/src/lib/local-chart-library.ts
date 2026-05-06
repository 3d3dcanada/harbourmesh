export const LOCAL_CHART_LIBRARY_STORAGE_KEY = 'harbormesh-local-chart-library';

export type LocalChartFormat =
  | 's57-enc'
  | 'bsb-rnc'
  | 'pdf-chart'
  | 'mbtiles'
  | 'pmtiles'
  | 'geojson'
  | 'unknown';

export type LocalChartReference = {
  id: string;
  fileName: string;
  fileExtension: string;
  byteLength: number;
  lastModified: string | null;
  addedAt: string;
  format: LocalChartFormat;
  region: 'NB_PILOT' | 'unknown';
  source: 'user_supplied_local_chart';
  policy: {
    localOnly: true;
    fileBytesStoredByHarbourMesh: false;
    uploadToCommunityMeshAllowed: false;
    sharedTileGenerationAllowed: false;
    requiresSeparateLicenceForSharing: true;
  };
};

export type LocalChartLibrary = {
  schemaVersion: 'harbourmesh.local-chart-library.v1';
  updatedAt: string;
  charts: LocalChartReference[];
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type FileLike = Pick<File, 'name' | 'size' | 'lastModified'>;
const LOCAL_CHART_FORMATS: LocalChartFormat[] = [
  's57-enc',
  'bsb-rnc',
  'pdf-chart',
  'mbtiles',
  'pmtiles',
  'geojson',
  'unknown',
];

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getExtension(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match?.[1]?.toLowerCase() ?? '';
}

export function detectLocalChartFormat(fileName: string): LocalChartFormat {
  const extension = getExtension(fileName);

  if (/^\d{3}$/.test(extension)) return 's57-enc';
  if (extension === '000') return 's57-enc';
  if (extension === 'kap' || extension === 'bsb') return 'bsb-rnc';
  if (extension === 'pdf') return 'pdf-chart';
  if (extension === 'mbtiles') return 'mbtiles';
  if (extension === 'pmtiles') return 'pmtiles';
  if (extension === 'geojson' || extension === 'json') return 'geojson';
  return 'unknown';
}

function validateChartReference(value: unknown): LocalChartReference | null {
  if (!isRecord(value)) return null;
  const policy = value.policy;
  if (!isRecord(policy)) return null;

  const reference = value as Partial<LocalChartReference>;
  if (
    typeof reference.id !== 'string' ||
    typeof reference.fileName !== 'string' ||
    typeof reference.fileExtension !== 'string' ||
    typeof reference.byteLength !== 'number' ||
    typeof reference.addedAt !== 'string' ||
    !LOCAL_CHART_FORMATS.includes(reference.format as LocalChartFormat) ||
    reference.source !== 'user_supplied_local_chart' ||
    policy.localOnly !== true ||
    policy.fileBytesStoredByHarbourMesh !== false ||
    policy.uploadToCommunityMeshAllowed !== false ||
    policy.sharedTileGenerationAllowed !== false ||
    policy.requiresSeparateLicenceForSharing !== true
  ) {
    return null;
  }

  return reference as LocalChartReference;
}

export function buildLocalChartReference(
  file: FileLike,
  options: { id?: string; addedAt?: string; region?: LocalChartReference['region'] } = {}
): LocalChartReference {
  const addedAt = options.addedAt ?? new Date().toISOString();
  const fileExtension = getExtension(file.name);

  return {
    id: options.id ?? `local-chart-${crypto.randomUUID()}`,
    fileName: file.name,
    fileExtension,
    byteLength: file.size,
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    addedAt,
    format: detectLocalChartFormat(file.name),
    region: options.region ?? 'NB_PILOT',
    source: 'user_supplied_local_chart',
    policy: {
      localOnly: true,
      fileBytesStoredByHarbourMesh: false,
      uploadToCommunityMeshAllowed: false,
      sharedTileGenerationAllowed: false,
      requiresSeparateLicenceForSharing: true,
    },
  };
}

export function loadLocalChartLibrary(storage: StorageLike | null = getDefaultStorage()): LocalChartLibrary {
  const fallback: LocalChartLibrary = {
    schemaVersion: 'harbourmesh.local-chart-library.v1',
    updatedAt: new Date(0).toISOString(),
    charts: [],
  };

  if (!storage) return fallback;
  const raw = storage.getItem(LOCAL_CHART_LIBRARY_STORAGE_KEY);
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return fallback;
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 'harbourmesh.local-chart-library.v1') return fallback;

  return {
    schemaVersion: 'harbourmesh.local-chart-library.v1',
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : fallback.updatedAt,
    charts: Array.isArray(parsed.charts) ? parsed.charts.flatMap((chart) => {
      const reference = validateChartReference(chart);
      return reference ? [reference] : [];
    }) : [],
  };
}

export function saveLocalChartLibrary(
  library: LocalChartLibrary,
  storage: StorageLike | null = getDefaultStorage()
): LocalChartLibrary {
  if (storage) {
    storage.setItem(LOCAL_CHART_LIBRARY_STORAGE_KEY, JSON.stringify(library));
  }

  return library;
}

export function addLocalChartReference(
  file: FileLike,
  storage: StorageLike | null = getDefaultStorage(),
  options: { id?: string; addedAt?: string; region?: LocalChartReference['region'] } = {}
): LocalChartLibrary {
  const reference = buildLocalChartReference(file, options);
  const current = loadLocalChartLibrary(storage);
  const updatedAt = options.addedAt ?? reference.addedAt;

  return saveLocalChartLibrary({
    schemaVersion: 'harbourmesh.local-chart-library.v1',
    updatedAt,
    charts: [
      reference,
      ...current.charts.filter((chart) => chart.fileName !== reference.fileName),
    ].slice(0, 100),
  }, storage);
}

export function forgetLocalChartReference(
  chartId: string,
  storage: StorageLike | null = getDefaultStorage(),
  updatedAt = new Date().toISOString()
): LocalChartLibrary {
  const current = loadLocalChartLibrary(storage);

  return saveLocalChartLibrary({
    schemaVersion: 'harbourmesh.local-chart-library.v1',
    updatedAt,
    charts: current.charts.filter((chart) => chart.id !== chartId),
  }, storage);
}

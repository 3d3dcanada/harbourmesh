import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import geojsonvt from 'geojson-vt';
import initSqlJs from 'sql.js';
import { fromGeojsonVt } from 'vt-pbf';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import {
  NB_PILOT_CHART_SOURCES,
  getNBPilotChartPackageManifest,
  type NBPilotChartPackage,
} from './chart-catalog.js';
import { fetchGeoNBSourceFeatures, type GeoNBFeatureFetchResult } from './geonb-feature-client.js';
import { buildPmTilesArchive } from './pmtiles-writer.js';

const require = createRequire(import.meta.url);
const MBTILES_LAYER_NAME = 'harbourmesh_reference';
const MBTILES_ZOOM_SPAN = 2;

type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [[
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]];
};

type ChartPackageArtifactContent = FeatureCollection<Geometry, GeoJsonProperties> & {
  metadata: {
    schemaVersion: 'harbourmesh.chart-package-artifact-content.v1';
    generatedAt: string;
    packageId: string;
    referenceOnly: true;
    officialChartDataIncluded: false;
    sourceFeatureCount: number;
  };
};

export type ChartPackageArtifactFormat = 'geojson' | 'mbtiles' | 'pmtiles';
type ChartPackageArtifactMediaType = 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';

export type NBPilotChartPackageArtifact = {
  id: string;
  packageId: string;
  region: 'NB_PILOT';
  format: ChartPackageArtifactFormat;
  mediaType: ChartPackageArtifactMediaType;
  fileName: string;
  downloadPath: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  officialChartDataIncluded: false;
  sourceIds: string[];
  excludedSourceIds: string[];
  warnings: string[];
  sourceFeatureCount: number;
  sourceFeatureSummaries: Array<{
    sourceId: string;
    sourceLabel: string;
    fetchedFeatureCount: number;
    maxFeatures: number;
    truncated: boolean;
  }>;
  content?: ChartPackageArtifactContent;
  tileSummary?: {
    layerName: typeof MBTILES_LAYER_NAME;
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: NBPilotChartPackage['bounds'];
  };
};

export type NBPilotChartPackageArtifactManifest = {
  id: 'nb-pilot-chart-package-artifacts';
  schemaVersion: 'harbourmesh.chart-package-artifacts.v1';
  generatedAt: string;
  artifacts: NBPilotChartPackageArtifact[];
  rules: {
    artifactsAreReferenceOnly: boolean;
    officialChartDataExcluded: boolean;
    pmtilesGenerationPending: boolean;
    mbtilesGenerationPending: boolean;
  };
};

export type NBPilotChartPackageArtifactReleaseFile = Omit<NBPilotChartPackageArtifact, 'content'> & {
  relativePath: string;
};

export type NBPilotChartPackageArtifactReleaseManifest = {
  id: 'nb-pilot-chart-package-artifact-release';
  schemaVersion: 'harbourmesh.chart-package-artifact-release.v1';
  generatedAt: string;
  outputDir: string;
  manifestFileName: 'manifest.json';
  artifacts: NBPilotChartPackageArtifactReleaseFile[];
  rules: NBPilotChartPackageArtifactManifest['rules'];
};

export type WriteNBPilotChartPackageArtifactsOptions = {
  outputDir: string;
  generatedAt?: string;
  includeGeoNBFeatures?: boolean;
  maxGeoNBFeaturesPerSource?: number;
  fetchImpl?: typeof fetch;
};

type BuildNBPilotChartPackageArtifactsOptions = {
  includeGeoNBFeatures?: boolean;
  maxGeoNBFeaturesPerSource?: number;
  fetchImpl?: typeof fetch;
};

type BuiltNBPilotChartPackageArtifact = NBPilotChartPackageArtifact & {
  bytes: Buffer;
};

type PackageSourceFeatureBundle = {
  features: Feature<Geometry, GeoJsonProperties>[];
  summaries: NBPilotChartPackageArtifact['sourceFeatureSummaries'];
};

type TileAddress = {
  z: number;
  x: number;
  y: number;
};

type BuiltVectorTile = TileAddress & {
  bytes: Buffer;
};

type BuiltVectorTileSet = {
  content: ChartPackageArtifactContent;
  minZoom: number;
  maxZoom: number;
  tiles: BuiltVectorTile[];
  metadata: {
    name: string;
    description: string;
    version: string;
    type: 'overlay';
    attribution: string;
    bounds: [number, number, number, number];
    center: [number, number, number];
    minzoom: number;
    maxzoom: number;
    vector_layers: Array<{
      id: typeof MBTILES_LAYER_NAME;
      description: string;
      minzoom: number;
      maxzoom: number;
      fields: Record<string, string>;
    }>;
  };
  tileSummary: NonNullable<NBPilotChartPackageArtifact['tileSummary']>;
};

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });
  return sqlJsPromise;
}

function packageBoundsToPolygon(chartPackage: NBPilotChartPackage): PolygonGeometry {
  const { south, west, north, east } = chartPackage.bounds;
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  };
}

function buildArtifactContent(
  chartPackage: NBPilotChartPackage,
  generatedAt: string,
  sourceFeatures: Feature<Geometry, GeoJsonProperties>[] = []
): ChartPackageArtifactContent {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: `package-boundary:${chartPackage.id}`,
        geometry: packageBoundsToPolygon(chartPackage),
        properties: {
          packageId: chartPackage.id,
          label: chartPackage.label,
          region: chartPackage.region,
          intendedUse: chartPackage.intendedUse,
          minZoom: chartPackage.minZoom,
          maxZoom: chartPackage.maxZoom,
          sourceIds: chartPackage.sourceIds,
          excludedSourceIds: chartPackage.excludedSourceIds,
          communityOverlayIncluded: chartPackage.communityOverlayIncluded,
          officialChartDataIncluded: false,
          artifactKind: 'package_boundary',
        },
      },
      ...sourceFeatures,
    ],
    metadata: {
      schemaVersion: 'harbourmesh.chart-package-artifact-content.v1',
      generatedAt,
      packageId: chartPackage.id,
      referenceOnly: true,
      officialChartDataIncluded: false,
      sourceFeatureCount: sourceFeatures.length,
    },
  };
}

function serializeArtifactContent(content: ChartPackageArtifactContent): string {
  return JSON.stringify(content);
}

function hashBytes(bytes: Buffer | string): { byteLength: number; sha256: string } {
  return {
    byteLength: Buffer.byteLength(bytes),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function artifactDownloadPath(
  chartPackage: NBPilotChartPackage,
  format: ChartPackageArtifactFormat,
  generatedAt: string
): string {
  return `/api/charts/nb/package-artifacts/${chartPackage.id}/${format}?generatedAt=${encodeURIComponent(generatedAt)}`;
}

function buildGeoJsonArtifact(
  chartPackage: NBPilotChartPackage,
  generatedAt: string,
  sourceBundle: PackageSourceFeatureBundle
): BuiltNBPilotChartPackageArtifact {
  const content = buildArtifactContent(chartPackage, generatedAt, sourceBundle.features);
  const bytes = Buffer.from(serializeArtifactContent(content));
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:${chartPackage.id}:geojson`,
    packageId: chartPackage.id,
    region: chartPackage.region,
    format: 'geojson',
    mediaType: 'application/geo+json',
    fileName: `${chartPackage.id}.geojson`,
    downloadPath: artifactDownloadPath(chartPackage, 'geojson', generatedAt),
    byteLength,
    sha256,
    generatedAt,
    officialChartDataIncluded: false,
    sourceIds: chartPackage.sourceIds,
    excludedSourceIds: chartPackage.excludedSourceIds,
    warnings: [
      ...chartPackage.warnings,
      'GeoJSON is a reference package manifest artifact, not a certified navigation chart.',
    ],
    sourceFeatureCount: sourceBundle.features.length,
    sourceFeatureSummaries: sourceBundle.summaries,
    content,
    bytes,
  };
}

function lonToTileX(longitude: number, zoom: number): number {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function latToTileY(latitude: number, zoom: number): number {
  const latRadians = latitude * Math.PI / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * 2 ** zoom
  );
}

function clampTile(value: number, zoom: number): number {
  return Math.max(0, Math.min(2 ** zoom - 1, value));
}

function enumerateTiles(bounds: NBPilotChartPackage['bounds'], minZoom: number, maxZoom: number): TileAddress[] {
  const tiles: TileAddress[] = [];
  for (let z = minZoom; z <= maxZoom; z += 1) {
    const minX = clampTile(lonToTileX(bounds.west, z), z);
    const maxX = clampTile(lonToTileX(bounds.east, z), z);
    const minY = clampTile(latToTileY(bounds.north, z), z);
    const maxY = clampTile(latToTileY(bounds.south, z), z);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        tiles.push({ z, x, y });
      }
    }
  }

  return tiles;
}

function artifactContentToGeoJson(content: ChartPackageArtifactContent): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: content.features,
  };
}

function buildTileMetadata(
  chartPackage: NBPilotChartPackage,
  minZoom: number,
  maxZoom: number
): BuiltVectorTileSet['metadata'] {
  return {
    name: chartPackage.id,
    description: `${chartPackage.label} HarbourMesh reference-only boundary and source-policy vector tiles`,
    version: '1',
    type: 'overlay',
    attribution: chartPackage.sourceIds.join(', '),
    bounds: [
      chartPackage.bounds.west,
      chartPackage.bounds.south,
      chartPackage.bounds.east,
      chartPackage.bounds.north,
    ],
    center: [
      (chartPackage.bounds.west + chartPackage.bounds.east) / 2,
      (chartPackage.bounds.south + chartPackage.bounds.north) / 2,
      minZoom,
    ],
    minzoom: minZoom,
    maxzoom: maxZoom,
    vector_layers: [
      {
        id: MBTILES_LAYER_NAME,
        description: 'HarbourMesh reference-only NB package boundary and source policy metadata',
        minzoom: minZoom,
        maxzoom: maxZoom,
        fields: {
          packageId: 'String',
          label: 'String',
          region: 'String',
          intendedUse: 'String',
          communityOverlayIncluded: 'Boolean',
          officialChartDataIncluded: 'Boolean',
          harbourmeshSourceId: 'String',
          harbourmeshReferenceOnly: 'Boolean',
        },
      },
    ],
  };
}

function buildVectorTileSet(
  chartPackage: NBPilotChartPackage,
  generatedAt: string,
  sourceBundle: PackageSourceFeatureBundle
): BuiltVectorTileSet {
  const minZoom = chartPackage.minZoom;
  const maxZoom = Math.min(chartPackage.maxZoom, chartPackage.minZoom + MBTILES_ZOOM_SPAN);
  const content = buildArtifactContent(chartPackage, generatedAt, sourceBundle.features);
  const tileIndex = geojsonvt(artifactContentToGeoJson(content), {
    maxZoom,
    indexMaxZoom: maxZoom,
    extent: 4096,
    buffer: 64,
  });
  const tileAddresses = enumerateTiles(chartPackage.bounds, minZoom, maxZoom);
  const tiles: BuiltVectorTile[] = [];

  for (const tileAddress of tileAddresses) {
    const tile = tileIndex.getTile(tileAddress.z, tileAddress.x, tileAddress.y);
    if (!tile || tile.features.length === 0) continue;

    tiles.push({
      ...tileAddress,
      bytes: Buffer.from(fromGeojsonVt(
        { [MBTILES_LAYER_NAME]: tile as unknown as ReturnType<typeof geojsonvt> },
        { version: 2, extent: 4096 }
      )),
    });
  }

  return {
    content,
    minZoom,
    maxZoom,
    tiles,
    metadata: buildTileMetadata(chartPackage, minZoom, maxZoom),
    tileSummary: {
      layerName: MBTILES_LAYER_NAME,
      minZoom,
      maxZoom,
      tileCount: tiles.length,
      bounds: chartPackage.bounds,
    },
  };
}

async function buildMbTilesArtifact(
  chartPackage: NBPilotChartPackage,
  generatedAt: string,
  sourceBundle: PackageSourceFeatureBundle
): Promise<BuiltNBPilotChartPackageArtifact> {
  const tileSet = buildVectorTileSet(chartPackage, generatedAt, sourceBundle);
  const SQL = await loadSqlJs();
  const db = new SQL.Database();

  try {
    db.run(`
      CREATE TABLE metadata (name text, value text);
      CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
      CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);
    `);

    const metadata = [
      ['name', tileSet.metadata.name],
      ['description', tileSet.metadata.description],
      ['version', tileSet.metadata.version],
      ['type', tileSet.metadata.type],
      ['format', 'pbf'],
      ['bounds', tileSet.metadata.bounds.join(',')],
      ['center', tileSet.metadata.center.join(',')],
      ['minzoom', String(tileSet.minZoom)],
      ['maxzoom', String(tileSet.maxZoom)],
      ['attribution', tileSet.metadata.attribution],
      ['json', JSON.stringify({
        vector_layers: tileSet.metadata.vector_layers,
      })],
    ];
    const insertMetadata = db.prepare('INSERT INTO metadata (name, value) VALUES (?, ?)');
    for (const row of metadata) insertMetadata.run(row);
    insertMetadata.free();

    const insertTile = db.prepare('INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)');
    for (const tile of tileSet.tiles) {
      const tmsY = 2 ** tile.z - 1 - tile.y;
      insertTile.run([tile.z, tile.x, tmsY, tile.bytes]);
    }
    insertTile.free();

    const bytes = Buffer.from(db.export());
    const { byteLength, sha256 } = hashBytes(bytes);
    return {
      id: `artifact:${chartPackage.id}:mbtiles`,
      packageId: chartPackage.id,
      region: chartPackage.region,
      format: 'mbtiles',
      mediaType: 'application/x-sqlite3',
      fileName: `${chartPackage.id}.mbtiles`,
      downloadPath: artifactDownloadPath(chartPackage, 'mbtiles', generatedAt),
      byteLength,
      sha256,
      generatedAt,
      officialChartDataIncluded: false,
      sourceIds: chartPackage.sourceIds,
      excludedSourceIds: chartPackage.excludedSourceIds,
      warnings: [
        ...chartPackage.warnings,
        sourceBundle.features.length > 0
          ? 'MBTiles contains capped eligible GeoNB source features plus package boundary/source-policy tiles; full production tiling still has to remove pilot feature limits.'
          : 'MBTiles contains starter reference boundary/source-policy vector tiles; eligible hydrography feature conversion still has to be expanded.',
      ],
      sourceFeatureCount: sourceBundle.features.length,
      sourceFeatureSummaries: sourceBundle.summaries,
      tileSummary: tileSet.tileSummary,
      bytes,
    };
  } finally {
    db.close();
  }
}

function buildPmTilesArtifact(
  chartPackage: NBPilotChartPackage,
  generatedAt: string,
  sourceBundle: PackageSourceFeatureBundle
): BuiltNBPilotChartPackageArtifact {
  const tileSet = buildVectorTileSet(chartPackage, generatedAt, sourceBundle);
  const bytes = buildPmTilesArchive({
    tiles: tileSet.tiles.map((tile) => ({
      z: tile.z,
      x: tile.x,
      y: tile.y,
      data: tile.bytes,
    })),
    minZoom: tileSet.minZoom,
    maxZoom: tileSet.maxZoom,
    bounds: chartPackage.bounds,
    metadata: tileSet.metadata,
  });
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:${chartPackage.id}:pmtiles`,
    packageId: chartPackage.id,
    region: chartPackage.region,
    format: 'pmtiles',
    mediaType: 'application/vnd.pmtiles',
    fileName: `${chartPackage.id}.pmtiles`,
    downloadPath: artifactDownloadPath(chartPackage, 'pmtiles', generatedAt),
    byteLength,
    sha256,
    generatedAt,
    officialChartDataIncluded: false,
    sourceIds: chartPackage.sourceIds,
    excludedSourceIds: chartPackage.excludedSourceIds,
    warnings: [
      ...chartPackage.warnings,
      sourceBundle.features.length > 0
        ? 'PMTiles contains capped eligible GeoNB source features plus package boundary/source-policy tiles; full production tiling still has to remove pilot feature limits.'
        : 'PMTiles contains starter reference boundary/source-policy vector tiles; eligible hydrography feature conversion still has to be expanded.',
    ],
    sourceFeatureCount: sourceBundle.features.length,
    sourceFeatureSummaries: sourceBundle.summaries,
    tileSummary: tileSet.tileSummary,
    bytes,
  };
}

function summarizeGeoNBFetch(fetchResult: GeoNBFeatureFetchResult): NBPilotChartPackageArtifact['sourceFeatureSummaries'][number] {
  return {
    sourceId: fetchResult.sourceId,
    sourceLabel: fetchResult.sourceLabel,
    fetchedFeatureCount: fetchResult.fetchedFeatureCount,
    maxFeatures: fetchResult.maxFeatures,
    truncated: fetchResult.truncated,
  };
}

async function loadPackageSourceFeatures(
  chartPackage: NBPilotChartPackage,
  options: BuildNBPilotChartPackageArtifactsOptions
): Promise<PackageSourceFeatureBundle> {
  if (!options.includeGeoNBFeatures) {
    return {
      features: [],
      summaries: [],
    };
  }

  const sourceById = new Map(NB_PILOT_CHART_SOURCES.map((source) => [source.id, source]));
  const maxFeatures = options.maxGeoNBFeaturesPerSource ?? 100;
  const fetchResults = await Promise.all(
    chartPackage.sourceIds
      .map((sourceId) => sourceById.get(sourceId))
      .filter((source): source is typeof NB_PILOT_CHART_SOURCES[number] => source?.kind === 'wms')
      .map((source) => fetchGeoNBSourceFeatures({
        source,
        packageId: chartPackage.id,
        bounds: chartPackage.bounds,
        maxFeatures,
        fetchImpl: options.fetchImpl,
      }))
  );

  return {
    features: fetchResults.flatMap((result) => result.collection.features),
    summaries: fetchResults.map(summarizeGeoNBFetch),
  };
}

async function buildArtifacts(
  generatedAt: string,
  options: BuildNBPilotChartPackageArtifactsOptions = {}
): Promise<BuiltNBPilotChartPackageArtifact[]> {
  const manifest = getNBPilotChartPackageManifest(generatedAt);
  const artifacts: BuiltNBPilotChartPackageArtifact[] = [];
  for (const chartPackage of manifest.packages) {
    const sourceBundle = await loadPackageSourceFeatures(chartPackage, options);
    artifacts.push(buildGeoJsonArtifact(chartPackage, generatedAt, sourceBundle));
    artifacts.push(await buildMbTilesArtifact(chartPackage, generatedAt, sourceBundle));
    artifacts.push(buildPmTilesArtifact(chartPackage, generatedAt, sourceBundle));
  }

  return artifacts;
}

function toPublicArtifact(artifact: BuiltNBPilotChartPackageArtifact): NBPilotChartPackageArtifact {
  const { bytes: _bytes, ...publicArtifact } = artifact;
  return publicArtifact;
}

export async function getNBPilotChartPackageArtifactManifest(
  generatedAt = new Date().toISOString(),
  options: BuildNBPilotChartPackageArtifactsOptions = {}
): Promise<NBPilotChartPackageArtifactManifest> {
  const artifacts = await buildArtifacts(generatedAt, options);

  return {
    id: 'nb-pilot-chart-package-artifacts',
    schemaVersion: 'harbourmesh.chart-package-artifacts.v1',
    generatedAt,
    artifacts: artifacts.map(toPublicArtifact),
    rules: {
      artifactsAreReferenceOnly: true,
      officialChartDataExcluded: true,
      pmtilesGenerationPending: false,
      mbtilesGenerationPending: false,
    },
  };
}

export async function getNBPilotChartPackageArtifactDownload(
  packageId: string,
  format: ChartPackageArtifactFormat,
  generatedAt = new Date().toISOString(),
  options: BuildNBPilotChartPackageArtifactsOptions = {}
): Promise<BuiltNBPilotChartPackageArtifact | undefined> {
  const artifacts = await buildArtifacts(generatedAt, options);
  return artifacts.find((artifact) => artifact.packageId === packageId && artifact.format === format);
}

export async function writeNBPilotChartPackageArtifacts(
  options: WriteNBPilotChartPackageArtifactsOptions
): Promise<NBPilotChartPackageArtifactReleaseManifest> {
  const outputDir = resolve(options.outputDir);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const buildOptions: BuildNBPilotChartPackageArtifactsOptions = {
    includeGeoNBFeatures: options.includeGeoNBFeatures,
    maxGeoNBFeaturesPerSource: options.maxGeoNBFeaturesPerSource,
    fetchImpl: options.fetchImpl,
  };
  const manifest = await getNBPilotChartPackageArtifactManifest(generatedAt, buildOptions);
  const builtArtifacts = await buildArtifacts(generatedAt, buildOptions);
  await mkdir(outputDir, { recursive: true });

  const releaseFiles: NBPilotChartPackageArtifactReleaseFile[] = [];
  for (const artifact of builtArtifacts) {
    await writeFile(join(outputDir, artifact.fileName), artifact.bytes);
    releaseFiles.push({
      id: artifact.id,
      packageId: artifact.packageId,
      region: artifact.region,
      format: artifact.format,
      mediaType: artifact.mediaType,
      fileName: artifact.fileName,
      downloadPath: artifact.downloadPath,
      byteLength: artifact.byteLength,
      sha256: artifact.sha256,
      generatedAt: artifact.generatedAt,
      officialChartDataIncluded: artifact.officialChartDataIncluded,
      sourceIds: artifact.sourceIds,
      excludedSourceIds: artifact.excludedSourceIds,
      warnings: artifact.warnings,
      sourceFeatureCount: artifact.sourceFeatureCount,
      sourceFeatureSummaries: artifact.sourceFeatureSummaries,
      tileSummary: artifact.tileSummary,
      relativePath: artifact.fileName,
    });
  }

  const releaseManifest: NBPilotChartPackageArtifactReleaseManifest = {
    id: 'nb-pilot-chart-package-artifact-release',
    schemaVersion: 'harbourmesh.chart-package-artifact-release.v1',
    generatedAt,
    outputDir,
    manifestFileName: 'manifest.json',
    artifacts: releaseFiles,
    rules: manifest.rules,
  };
  await writeFile(
    join(outputDir, releaseManifest.manifestFileName),
    `${JSON.stringify(releaseManifest, null, 2)}\n`,
    'utf8'
  );

  return releaseManifest;
}

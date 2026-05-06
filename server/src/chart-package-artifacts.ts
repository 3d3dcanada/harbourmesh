import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import geojsonvt from 'geojson-vt';
import initSqlJs from 'sql.js';
import { fromGeojsonVt } from 'vt-pbf';
import type { FeatureCollection } from 'geojson';
import {
  getNBPilotChartPackageManifest,
  type NBPilotChartPackage,
} from './chart-catalog.js';

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

type ChartPackageArtifactContent = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: PolygonGeometry;
    properties: {
      packageId: string;
      label: string;
      region: 'NB_PILOT';
      intendedUse: 'reference_only';
      minZoom: number;
      maxZoom: number;
      sourceIds: string[];
      excludedSourceIds: string[];
      communityOverlayIncluded: boolean;
      officialChartDataIncluded: false;
    };
  }>;
  metadata: {
    schemaVersion: 'harbourmesh.chart-package-artifact-content.v1';
    generatedAt: string;
    packageId: string;
    referenceOnly: true;
    officialChartDataIncluded: false;
  };
};

type ChartPackageArtifactFormat = 'geojson' | 'mbtiles';
type ChartPackageArtifactMediaType = 'application/geo+json' | 'application/x-sqlite3';

export type NBPilotChartPackageArtifact = {
  id: string;
  packageId: string;
  region: 'NB_PILOT';
  format: ChartPackageArtifactFormat;
  mediaType: ChartPackageArtifactMediaType;
  fileName: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  officialChartDataIncluded: false;
  sourceIds: string[];
  excludedSourceIds: string[];
  warnings: string[];
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
};

type BuiltNBPilotChartPackageArtifact = NBPilotChartPackageArtifact & {
  bytes: Buffer;
};

type TileAddress = {
  z: number;
  x: number;
  y: number;
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
  generatedAt: string
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
        },
      },
    ],
    metadata: {
      schemaVersion: 'harbourmesh.chart-package-artifact-content.v1',
      generatedAt,
      packageId: chartPackage.id,
      referenceOnly: true,
      officialChartDataIncluded: false,
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

function buildGeoJsonArtifact(
  chartPackage: NBPilotChartPackage,
  generatedAt: string
): BuiltNBPilotChartPackageArtifact {
  const content = buildArtifactContent(chartPackage, generatedAt);
  const bytes = Buffer.from(serializeArtifactContent(content));
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:${chartPackage.id}:geojson`,
    packageId: chartPackage.id,
    region: chartPackage.region,
    format: 'geojson',
    mediaType: 'application/geo+json',
    fileName: `${chartPackage.id}.geojson`,
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
    features: content.features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        artifactKind: 'package_boundary',
      },
    })),
  };
}

async function buildMbTilesArtifact(
  chartPackage: NBPilotChartPackage,
  generatedAt: string
): Promise<BuiltNBPilotChartPackageArtifact> {
  const minZoom = chartPackage.minZoom;
  const maxZoom = Math.min(chartPackage.maxZoom, chartPackage.minZoom + MBTILES_ZOOM_SPAN);
  const content = buildArtifactContent(chartPackage, generatedAt);
  const tileIndex = geojsonvt(artifactContentToGeoJson(content), {
    maxZoom,
    indexMaxZoom: maxZoom,
    extent: 4096,
    buffer: 64,
  });
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  const tileAddresses = enumerateTiles(chartPackage.bounds, minZoom, maxZoom);
  let tileCount = 0;

  try {
    db.run(`
      CREATE TABLE metadata (name text, value text);
      CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
      CREATE UNIQUE INDEX tile_index ON tiles (zoom_level, tile_column, tile_row);
    `);

    const metadata = [
      ['name', chartPackage.id],
      ['description', `${chartPackage.label} HarbourMesh reference-only boundary and source-policy vector tiles`],
      ['version', '1'],
      ['type', 'overlay'],
      ['format', 'pbf'],
      ['bounds', `${chartPackage.bounds.west},${chartPackage.bounds.south},${chartPackage.bounds.east},${chartPackage.bounds.north}`],
      ['center', `${(chartPackage.bounds.west + chartPackage.bounds.east) / 2},${(chartPackage.bounds.south + chartPackage.bounds.north) / 2},${minZoom}`],
      ['minzoom', String(minZoom)],
      ['maxzoom', String(maxZoom)],
      ['attribution', chartPackage.sourceIds.join(', ')],
      ['json', JSON.stringify({
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
            },
          },
        ],
      })],
    ];
    const insertMetadata = db.prepare('INSERT INTO metadata (name, value) VALUES (?, ?)');
    for (const row of metadata) insertMetadata.run(row);
    insertMetadata.free();

    const insertTile = db.prepare('INSERT INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)');
    for (const tileAddress of tileAddresses) {
      const tile = tileIndex.getTile(tileAddress.z, tileAddress.x, tileAddress.y);
      if (!tile || tile.features.length === 0) continue;

      const tmsY = 2 ** tileAddress.z - 1 - tileAddress.y;
      const tileBytes = fromGeojsonVt(
        { [MBTILES_LAYER_NAME]: tile as unknown as ReturnType<typeof geojsonvt> },
        { version: 2, extent: 4096 }
      );
      insertTile.run([tileAddress.z, tileAddress.x, tmsY, tileBytes]);
      tileCount += 1;
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
      byteLength,
      sha256,
      generatedAt,
      officialChartDataIncluded: false,
      sourceIds: chartPackage.sourceIds,
      excludedSourceIds: chartPackage.excludedSourceIds,
      warnings: [
        ...chartPackage.warnings,
        'MBTiles contains starter reference boundary/source-policy vector tiles; eligible hydrography feature conversion still has to be expanded.',
      ],
      tileSummary: {
        layerName: MBTILES_LAYER_NAME,
        minZoom,
        maxZoom,
        tileCount,
        bounds: chartPackage.bounds,
      },
      bytes,
    };
  } finally {
    db.close();
  }
}

async function buildArtifacts(generatedAt: string): Promise<BuiltNBPilotChartPackageArtifact[]> {
  const manifest = getNBPilotChartPackageManifest(generatedAt);
  const artifacts: BuiltNBPilotChartPackageArtifact[] = [];
  for (const chartPackage of manifest.packages) {
    artifacts.push(buildGeoJsonArtifact(chartPackage, generatedAt));
    artifacts.push(await buildMbTilesArtifact(chartPackage, generatedAt));
  }

  return artifacts;
}

function toPublicArtifact(artifact: BuiltNBPilotChartPackageArtifact): NBPilotChartPackageArtifact {
  const { bytes: _bytes, ...publicArtifact } = artifact;
  return publicArtifact;
}

export async function getNBPilotChartPackageArtifactManifest(
  generatedAt = new Date().toISOString()
): Promise<NBPilotChartPackageArtifactManifest> {
  const artifacts = await buildArtifacts(generatedAt);

  return {
    id: 'nb-pilot-chart-package-artifacts',
    schemaVersion: 'harbourmesh.chart-package-artifacts.v1',
    generatedAt,
    artifacts: artifacts.map(toPublicArtifact),
    rules: {
      artifactsAreReferenceOnly: true,
      officialChartDataExcluded: true,
      pmtilesGenerationPending: true,
      mbtilesGenerationPending: false,
    },
  };
}

export async function writeNBPilotChartPackageArtifacts(
  options: WriteNBPilotChartPackageArtifactsOptions
): Promise<NBPilotChartPackageArtifactReleaseManifest> {
  const outputDir = resolve(options.outputDir);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const manifest = await getNBPilotChartPackageArtifactManifest(generatedAt);
  const builtArtifacts = await buildArtifacts(generatedAt);
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
      byteLength: artifact.byteLength,
      sha256: artifact.sha256,
      generatedAt: artifact.generatedAt,
      officialChartDataIncluded: artifact.officialChartDataIncluded,
      sourceIds: artifact.sourceIds,
      excludedSourceIds: artifact.excludedSourceIds,
      warnings: artifact.warnings,
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

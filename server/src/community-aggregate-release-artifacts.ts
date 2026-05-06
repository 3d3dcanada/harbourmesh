import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import geojsonvt from 'geojson-vt';
import initSqlJs from 'sql.js';
import { fromGeojsonVt } from 'vt-pbf';
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { CommunityAggregateGeoJson } from './community-aggregates.js';
import type { CommunityAggregateReleaseManifest } from './community-release-manifests.js';
import { buildPmTilesArchive } from './pmtiles-writer.js';

const require = createRequire(import.meta.url);
const COMMUNITY_AGGREGATE_LAYER_NAME = 'harbourmesh_community_aggregate';
const COMMUNITY_AGGREGATE_MIN_ZOOM = 8;
const COMMUNITY_AGGREGATE_MAX_ZOOM = 12;

type TileAddress = {
  z: number;
  x: number;
  y: number;
};

type BuiltVectorTile = TileAddress & {
  bytes: Buffer;
};

type AggregateBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type BuiltCommunityAggregateVectorTileSet = {
  minZoom: number;
  maxZoom: number;
  bounds: AggregateBounds;
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
      id: typeof COMMUNITY_AGGREGATE_LAYER_NAME;
      description: string;
      minzoom: number;
      maxzoom: number;
      fields: Record<string, string>;
    }>;
  };
  tileSummary: CommunityAggregateReleaseArtifact['tileSummary'];
};

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });
  return sqlJsPromise;
}

export type CommunityAggregateReleaseArtifactFormat = 'geojson' | 'mbtiles' | 'pmtiles';

export type CommunityAggregateReleaseArtifact = {
  id: string;
  releaseId: string;
  region: 'NB_PILOT';
  format: CommunityAggregateReleaseArtifactFormat;
  mediaType: 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';
  fileName: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  aggregateCells: number;
  officialChartDataIncluded: false;
  rawRecordIdsIncluded: false;
  vesselIdsIncluded: false;
  warnings: string[];
  content?: CommunityAggregateGeoJson;
  tileSummary?: {
    layerName: typeof COMMUNITY_AGGREGATE_LAYER_NAME;
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: AggregateBounds;
  };
};

export type BuiltCommunityAggregateReleaseArtifact = CommunityAggregateReleaseArtifact & {
  bytes: Buffer;
};

export type CommunityAggregateReleaseArtifactManifest = {
  id: string;
  schemaVersion: 'harbourmesh.community-aggregate-release-artifacts.v1';
  releaseId: string;
  generatedAt: string;
  artifacts: CommunityAggregateReleaseArtifact[];
  rules: {
    artifactsAreReferenceOnly: true;
    officialChartDataExcluded: true;
    rawRecordIdsExcluded: true;
    vesselIdsExcluded: true;
    vectorTileGenerationPending: boolean;
  };
};

function hashBytes(bytes: Buffer | string): { byteLength: number; sha256: string } {
  return {
    byteLength: Buffer.byteLength(bytes),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function publicArtifact(artifact: BuiltCommunityAggregateReleaseArtifact): CommunityAggregateReleaseArtifact {
  const { bytes: _bytes, ...rest } = artifact;
  return rest;
}

function releaseDate(release: CommunityAggregateReleaseManifest): string {
  return release.generatedAt.slice(0, 10);
}

function buildGeoJsonArtifact(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson
): BuiltCommunityAggregateReleaseArtifact {
  const bytes = Buffer.from(JSON.stringify(aggregate), 'utf8');
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:${release.id}:geojson`,
    releaseId: release.id,
    region: release.region,
    format: 'geojson',
    mediaType: 'application/geo+json',
    fileName: `community-aggregates-${releaseDate(release)}.geojson`,
    byteLength,
    sha256,
    generatedAt: release.generatedAt,
    aggregateCells: aggregate.features.length,
    officialChartDataIncluded: false,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    warnings: [
      'Community aggregate GeoJSON is a reference overlay, not a certified navigation chart.',
    ],
    content: aggregate,
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

function enumerateTiles(bounds: AggregateBounds, minZoom: number, maxZoom: number): TileAddress[] {
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

function deriveBounds(aggregate: CommunityAggregateGeoJson): AggregateBounds | null {
  const coordinates = aggregate.features.flatMap((feature) => feature.geometry.coordinates[0]);
  if (coordinates.length === 0) return null;

  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);

  return {
    south: Math.min(...latitudes),
    west: Math.min(...longitudes),
    north: Math.max(...latitudes),
    east: Math.max(...longitudes),
  };
}

function aggregateToGeoJson(aggregate: CommunityAggregateGeoJson): FeatureCollection<Geometry, GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features: aggregate.features as FeatureCollection<Geometry, GeoJsonProperties>['features'],
  };
}

function buildTileMetadata(
  release: CommunityAggregateReleaseManifest,
  bounds: AggregateBounds,
  minZoom: number,
  maxZoom: number
): BuiltCommunityAggregateVectorTileSet['metadata'] {
  return {
    name: release.id,
    description: 'HarbourMesh community aggregate reference overlay vector tiles',
    version: '1',
    type: 'overlay',
    attribution: 'HarbourMesh opt-in community aggregate records',
    bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
    center: [
      (bounds.west + bounds.east) / 2,
      (bounds.south + bounds.north) / 2,
      minZoom,
    ],
    minzoom: minZoom,
    maxzoom: maxZoom,
    vector_layers: [
      {
        id: COMMUNITY_AGGREGATE_LAYER_NAME,
        description: 'Privacy-preserving HarbourMesh community aggregate cells',
        minzoom: minZoom,
        maxzoom: maxZoom,
        fields: {
          kind: 'String',
          cellId: 'String',
          region: 'String',
          soundingCount: 'Number',
          observationCount: 'Number',
          hazardCount: 'Number',
          averageDepthMeters: 'Number',
          averageConfidence: 'Number',
          officialChartDataIncluded: 'Boolean',
          rawRecordIdsIncluded: 'Boolean',
          vesselIdsIncluded: 'Boolean',
        },
      },
    ],
  };
}

function buildVectorTileSet(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson
): BuiltCommunityAggregateVectorTileSet | null {
  const bounds = deriveBounds(aggregate);
  if (!bounds) return null;

  const minZoom = COMMUNITY_AGGREGATE_MIN_ZOOM;
  const maxZoom = COMMUNITY_AGGREGATE_MAX_ZOOM;
  const tileIndex = geojsonvt(aggregateToGeoJson(aggregate), {
    maxZoom,
    indexMaxZoom: maxZoom,
    extent: 4096,
    buffer: 64,
  });
  const tiles: BuiltVectorTile[] = [];

  for (const tileAddress of enumerateTiles(bounds, minZoom, maxZoom)) {
    const tile = tileIndex.getTile(tileAddress.z, tileAddress.x, tileAddress.y);
    if (!tile || tile.features.length === 0) continue;

    tiles.push({
      ...tileAddress,
      bytes: Buffer.from(fromGeojsonVt(
        { [COMMUNITY_AGGREGATE_LAYER_NAME]: tile as unknown as ReturnType<typeof geojsonvt> },
        { version: 2, extent: 4096 }
      )),
    });
  }

  if (tiles.length === 0) return null;

  return {
    minZoom,
    maxZoom,
    bounds,
    tiles,
    metadata: buildTileMetadata(release, bounds, minZoom, maxZoom),
    tileSummary: {
      layerName: COMMUNITY_AGGREGATE_LAYER_NAME,
      minZoom,
      maxZoom,
      tileCount: tiles.length,
      bounds,
    },
  };
}

async function buildMbTilesArtifact(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson,
  tileSet: BuiltCommunityAggregateVectorTileSet
): Promise<BuiltCommunityAggregateReleaseArtifact> {
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
      ['json', JSON.stringify({ vector_layers: tileSet.metadata.vector_layers })],
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
      id: `artifact:${release.id}:mbtiles`,
      releaseId: release.id,
      region: release.region,
      format: 'mbtiles',
      mediaType: 'application/x-sqlite3',
      fileName: `community-aggregates-${releaseDate(release)}.mbtiles`,
      byteLength,
      sha256,
      generatedAt: release.generatedAt,
      aggregateCells: aggregate.features.length,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      warnings: [
        'Community aggregate MBTiles are reference overlay tiles, not certified navigation charts.',
      ],
      tileSummary: tileSet.tileSummary,
      bytes,
    };
  } finally {
    db.close();
  }
}

function buildPmTilesArtifact(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson,
  tileSet: BuiltCommunityAggregateVectorTileSet
): BuiltCommunityAggregateReleaseArtifact {
  const bytes = buildPmTilesArchive({
    tiles: tileSet.tiles.map((tile) => ({
      z: tile.z,
      x: tile.x,
      y: tile.y,
      data: tile.bytes,
    })),
    minZoom: tileSet.minZoom,
    maxZoom: tileSet.maxZoom,
    bounds: tileSet.bounds,
    metadata: tileSet.metadata,
  });
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:${release.id}:pmtiles`,
    releaseId: release.id,
    region: release.region,
    format: 'pmtiles',
    mediaType: 'application/vnd.pmtiles',
    fileName: `community-aggregates-${releaseDate(release)}.pmtiles`,
    byteLength,
    sha256,
    generatedAt: release.generatedAt,
    aggregateCells: aggregate.features.length,
    officialChartDataIncluded: false,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    warnings: [
      'Community aggregate PMTiles are reference overlay tiles, not certified navigation charts.',
    ],
    tileSummary: tileSet.tileSummary,
    bytes,
  };
}

export async function buildCommunityAggregateReleaseArtifacts(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson
): Promise<BuiltCommunityAggregateReleaseArtifact[]> {
  const artifacts: BuiltCommunityAggregateReleaseArtifact[] = [
    buildGeoJsonArtifact(release, aggregate),
  ];
  const tileSet = buildVectorTileSet(release, aggregate);
  if (!tileSet) return artifacts;

  artifacts.push(await buildMbTilesArtifact(release, aggregate, tileSet));
  artifacts.push(buildPmTilesArtifact(release, aggregate, tileSet));
  return artifacts;
}

export async function getCommunityAggregateReleaseArtifactManifest(
  release: CommunityAggregateReleaseManifest,
  aggregate: CommunityAggregateGeoJson
): Promise<CommunityAggregateReleaseArtifactManifest> {
  const artifacts = await buildCommunityAggregateReleaseArtifacts(release, aggregate);
  const vectorTileArtifacts = artifacts.filter((artifact) => artifact.format === 'mbtiles' || artifact.format === 'pmtiles');

  return {
    id: `community-aggregate-release-artifacts:${release.id}`,
    schemaVersion: 'harbourmesh.community-aggregate-release-artifacts.v1',
    releaseId: release.id,
    generatedAt: release.generatedAt,
    artifacts: artifacts.map(publicArtifact),
    rules: {
      artifactsAreReferenceOnly: true,
      officialChartDataExcluded: true,
      rawRecordIdsExcluded: true,
      vesselIdsExcluded: true,
      vectorTileGenerationPending: vectorTileArtifacts.length < 2,
    },
  };
}

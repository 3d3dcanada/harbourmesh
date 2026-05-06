import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import type { FeatureCollection, GeoJsonProperties, Point } from 'geojson';
import geojsonvt from 'geojson-vt';
import initSqlJs from 'sql.js';
import { fromGeojsonVt } from 'vt-pbf';
import type { StoredCommunityHazard } from './community-hazard-repository.js';
import { buildPmTilesArchive } from './pmtiles-writer.js';

const require = createRequire(import.meta.url);
const COMMUNITY_HAZARD_LAYER_NAME = 'harbourmesh_community_hazards';
const COMMUNITY_HAZARD_MIN_ZOOM = 8;
const COMMUNITY_HAZARD_MAX_ZOOM = 12;

type HazardBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type TileAddress = {
  z: number;
  x: number;
  y: number;
};

type BuiltVectorTile = TileAddress & {
  bytes: Buffer;
};

type HazardFeature = {
  type: 'Feature';
  id: string;
  geometry: Point;
  properties: {
    kind: 'community_hazard';
    publicId: string;
    region: string;
    hazardType: StoredCommunityHazard['type'];
    severity: StoredCommunityHazard['severity'];
    description: string;
    reportedAt: string;
    reviewedAt: string | null;
    sharingState: StoredCommunityHazard['sharingState'];
    positionAccuracyMeters: number | null;
    officialChartDataIncluded: false;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    sourceDeviceIdsIncluded: false;
  };
};

type HazardGeoJson = {
  type: 'FeatureCollection';
  features: HazardFeature[];
  metadata: {
    schemaVersion: 'harbourmesh.community-hazard-artifacts.geojson.v1';
    generatedAt: string;
    intendedUse: 'community_reference_overlay';
    communityProductsAreReferenceOnly: true;
    officialChartDataIncluded: false;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    sourceDeviceIdsIncluded: false;
    sourceRecordCounts: {
      hazards: number;
      publicHazards: number;
      omittedPendingOrRejectedHazards: number;
      omittedUnpositionedHazards: number;
    };
  };
};

type BuiltCommunityHazardVectorTileSet = {
  minZoom: number;
  maxZoom: number;
  bounds: HazardBounds;
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
      id: typeof COMMUNITY_HAZARD_LAYER_NAME;
      description: string;
      minzoom: number;
      maxzoom: number;
      fields: Record<string, string>;
    }>;
  };
  tileSummary: CommunityHazardArtifact['tileSummary'];
};

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function loadSqlJs(): Promise<SqlJsStatic> {
  sqlJsPromise ??= initSqlJs({
    locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
  });
  return sqlJsPromise;
}

export type CommunityHazardArtifactFormat = 'geojson' | 'mbtiles' | 'pmtiles';

export type CommunityHazardArtifact = {
  id: string;
  region: 'NB_PILOT';
  format: CommunityHazardArtifactFormat;
  mediaType: 'application/geo+json' | 'application/x-sqlite3' | 'application/vnd.pmtiles';
  fileName: string;
  downloadPath: string;
  byteLength: number;
  sha256: string;
  generatedAt: string;
  hazardFeatures: number;
  officialChartDataIncluded: false;
  rawRecordIdsIncluded: false;
  vesselIdsIncluded: false;
  sourceDeviceIdsIncluded: false;
  warnings: string[];
  content?: HazardGeoJson;
  tileSummary?: {
    layerName: typeof COMMUNITY_HAZARD_LAYER_NAME;
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    bounds: HazardBounds;
  };
};

export type BuiltCommunityHazardArtifact = CommunityHazardArtifact & {
  bytes: Buffer;
};

export type CommunityHazardArtifactManifest = {
  id: string;
  schemaVersion: 'harbourmesh.community-hazard-artifacts.v1';
  generatedAt: string;
  artifacts: CommunityHazardArtifact[];
  rules: {
    artifactsAreReferenceOnly: true;
    officialChartDataExcluded: true;
    rawRecordIdsExcluded: true;
    vesselIdsExcluded: true;
    sourceDeviceIdsExcluded: true;
    vectorTileGenerationPending: boolean;
  };
  sourceRecordCounts: HazardGeoJson['metadata']['sourceRecordCounts'];
};

function hashBytes(bytes: Buffer | string): { byteLength: number; sha256: string } {
  return {
    byteLength: Buffer.byteLength(bytes),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function publicHazardId(hazardId: string): string {
  return `hz_${createHash('sha256').update(hazardId).digest('hex').slice(0, 16)}`;
}

function artifactDate(generatedAt: string): string {
  return generatedAt.slice(0, 10);
}

function artifactDownloadPath(format: CommunityHazardArtifactFormat, generatedAt: string): string {
  return `/api/community/hazards/artifacts/${format}?generatedAt=${encodeURIComponent(generatedAt)}`;
}

function publicArtifact(artifact: BuiltCommunityHazardArtifact): CommunityHazardArtifact {
  const { bytes: _bytes, ...rest } = artifact;
  return rest;
}

function toPublicHazardFeature(hazard: StoredCommunityHazard): HazardFeature | null {
  if (!hazard.publicOverlayEligible || !hazard.position) return null;

  const publicId = publicHazardId(hazard.id);
  return {
    type: 'Feature',
    id: `hazard:${publicId}`,
    geometry: {
      type: 'Point',
      coordinates: [hazard.position.longitude, hazard.position.latitude],
    },
    properties: {
      kind: 'community_hazard',
      publicId,
      region: hazard.region,
      hazardType: hazard.type,
      severity: hazard.severity,
      description: hazard.description,
      reportedAt: hazard.reportedAt,
      reviewedAt: hazard.reviewedAt ?? null,
      sharingState: hazard.sharingState,
      positionAccuracyMeters: hazard.position.accuracy ?? null,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      sourceDeviceIdsIncluded: false,
    },
  };
}

function buildHazardGeoJson(hazards: StoredCommunityHazard[], generatedAt: string): HazardGeoJson {
  const features = hazards.flatMap((hazard) => {
    const feature = toPublicHazardFeature(hazard);
    return feature ? [feature] : [];
  });
  const acceptedHazards = hazards.filter((hazard) => hazard.reviewStatus === 'accepted');
  const omittedUnpositionedHazards = acceptedHazards.filter((hazard) => !hazard.position).length;

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      schemaVersion: 'harbourmesh.community-hazard-artifacts.geojson.v1',
      generatedAt,
      intendedUse: 'community_reference_overlay',
      communityProductsAreReferenceOnly: true,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      sourceDeviceIdsIncluded: false,
      sourceRecordCounts: {
        hazards: hazards.length,
        publicHazards: features.length,
        omittedPendingOrRejectedHazards: hazards.length - acceptedHazards.length,
        omittedUnpositionedHazards,
      },
    },
  };
}

function buildGeoJsonArtifact(
  geojson: HazardGeoJson,
  generatedAt: string
): BuiltCommunityHazardArtifact {
  const bytes = Buffer.from(JSON.stringify(geojson), 'utf8');
  const { byteLength, sha256 } = hashBytes(bytes);

  return {
    id: `artifact:community-hazards:${generatedAt}:geojson`,
    region: 'NB_PILOT',
    format: 'geojson',
    mediaType: 'application/geo+json',
    fileName: `community-hazards-${artifactDate(generatedAt)}.geojson`,
    downloadPath: artifactDownloadPath('geojson', generatedAt),
    byteLength,
    sha256,
    generatedAt,
    hazardFeatures: geojson.features.length,
    officialChartDataIncluded: false,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    sourceDeviceIdsIncluded: false,
    warnings: [
      'Community hazard GeoJSON is a reference overlay, not a certified navigation chart.',
    ],
    content: geojson,
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

function enumerateTiles(bounds: HazardBounds, minZoom: number, maxZoom: number): TileAddress[] {
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

function deriveBounds(geojson: HazardGeoJson): HazardBounds | null {
  const coordinates = geojson.features.map((feature) => feature.geometry.coordinates);
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

function hazardToGeoJson(geojson: HazardGeoJson): FeatureCollection<Point, GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features: geojson.features as FeatureCollection<Point, GeoJsonProperties>['features'],
  };
}

function buildTileMetadata(
  generatedAt: string,
  bounds: HazardBounds,
  minZoom: number,
  maxZoom: number
): BuiltCommunityHazardVectorTileSet['metadata'] {
  return {
    name: `community-hazards:${generatedAt}`,
    description: 'HarbourMesh accepted community hazard reference overlay vector tiles',
    version: '1',
    type: 'overlay',
    attribution: 'HarbourMesh opt-in accepted community hazard reports',
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
        id: COMMUNITY_HAZARD_LAYER_NAME,
        description: 'Accepted HarbourMesh community hazards without vessel/source identifiers',
        minzoom: minZoom,
        maxzoom: maxZoom,
        fields: {
          kind: 'String',
          publicId: 'String',
          region: 'String',
          hazardType: 'String',
          severity: 'String',
          description: 'String',
          reportedAt: 'String',
          reviewedAt: 'String',
          sharingState: 'String',
          positionAccuracyMeters: 'Number',
          officialChartDataIncluded: 'Boolean',
          rawRecordIdsIncluded: 'Boolean',
          vesselIdsIncluded: 'Boolean',
          sourceDeviceIdsIncluded: 'Boolean',
        },
      },
    ],
  };
}

function buildVectorTileSet(
  geojson: HazardGeoJson,
  generatedAt: string
): BuiltCommunityHazardVectorTileSet | null {
  const bounds = deriveBounds(geojson);
  if (!bounds) return null;

  const minZoom = COMMUNITY_HAZARD_MIN_ZOOM;
  const maxZoom = COMMUNITY_HAZARD_MAX_ZOOM;
  const tileIndex = geojsonvt(hazardToGeoJson(geojson), {
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
        { [COMMUNITY_HAZARD_LAYER_NAME]: tile as unknown as ReturnType<typeof geojsonvt> },
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
    metadata: buildTileMetadata(generatedAt, bounds, minZoom, maxZoom),
    tileSummary: {
      layerName: COMMUNITY_HAZARD_LAYER_NAME,
      minZoom,
      maxZoom,
      tileCount: tiles.length,
      bounds,
    },
  };
}

async function buildMbTilesArtifact(
  geojson: HazardGeoJson,
  generatedAt: string,
  tileSet: BuiltCommunityHazardVectorTileSet
): Promise<BuiltCommunityHazardArtifact> {
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
      id: `artifact:community-hazards:${generatedAt}:mbtiles`,
      region: 'NB_PILOT',
      format: 'mbtiles',
      mediaType: 'application/x-sqlite3',
      fileName: `community-hazards-${artifactDate(generatedAt)}.mbtiles`,
      downloadPath: artifactDownloadPath('mbtiles', generatedAt),
      byteLength,
      sha256,
      generatedAt,
      hazardFeatures: geojson.features.length,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      sourceDeviceIdsIncluded: false,
      warnings: [
        'Community hazard MBTiles are reference overlay tiles, not certified navigation charts.',
      ],
      tileSummary: tileSet.tileSummary,
      bytes,
    };
  } finally {
    db.close();
  }
}

function buildPmTilesArtifact(
  geojson: HazardGeoJson,
  generatedAt: string,
  tileSet: BuiltCommunityHazardVectorTileSet
): BuiltCommunityHazardArtifact {
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
    id: `artifact:community-hazards:${generatedAt}:pmtiles`,
    region: 'NB_PILOT',
    format: 'pmtiles',
    mediaType: 'application/vnd.pmtiles',
    fileName: `community-hazards-${artifactDate(generatedAt)}.pmtiles`,
    downloadPath: artifactDownloadPath('pmtiles', generatedAt),
    byteLength,
    sha256,
    generatedAt,
    hazardFeatures: geojson.features.length,
    officialChartDataIncluded: false,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    sourceDeviceIdsIncluded: false,
    warnings: [
      'Community hazard PMTiles are reference overlay tiles, not certified navigation charts.',
    ],
    tileSummary: tileSet.tileSummary,
    bytes,
  };
}

export async function buildCommunityHazardArtifacts(
  hazards: StoredCommunityHazard[],
  generatedAt = new Date().toISOString()
): Promise<BuiltCommunityHazardArtifact[]> {
  const geojson = buildHazardGeoJson(hazards, generatedAt);
  const artifacts: BuiltCommunityHazardArtifact[] = [
    buildGeoJsonArtifact(geojson, generatedAt),
  ];
  const tileSet = buildVectorTileSet(geojson, generatedAt);
  if (!tileSet) return artifacts;

  artifacts.push(await buildMbTilesArtifact(geojson, generatedAt, tileSet));
  artifacts.push(buildPmTilesArtifact(geojson, generatedAt, tileSet));
  return artifacts;
}

export async function getCommunityHazardArtifactManifest(
  hazards: StoredCommunityHazard[],
  generatedAt = new Date().toISOString()
): Promise<CommunityHazardArtifactManifest> {
  const artifacts = await buildCommunityHazardArtifacts(hazards, generatedAt);
  const vectorTileArtifacts = artifacts.filter((artifact) => artifact.format === 'mbtiles' || artifact.format === 'pmtiles');
  const geojson = artifacts.find((artifact) => artifact.format === 'geojson')?.content;

  return {
    id: `community-hazard-artifacts:${generatedAt}`,
    schemaVersion: 'harbourmesh.community-hazard-artifacts.v1',
    generatedAt,
    artifacts: artifacts.map(publicArtifact),
    rules: {
      artifactsAreReferenceOnly: true,
      officialChartDataExcluded: true,
      rawRecordIdsExcluded: true,
      vesselIdsExcluded: true,
      sourceDeviceIdsExcluded: true,
      vectorTileGenerationPending: vectorTileArtifacts.length < 2,
    },
    sourceRecordCounts: geojson?.metadata.sourceRecordCounts ?? {
      hazards: hazards.length,
      publicHazards: 0,
      omittedPendingOrRejectedHazards: hazards.length,
      omittedUnpositionedHazards: 0,
    },
  };
}

export type PmTilesBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PmTilesTile = {
  z: number;
  x: number;
  y: number;
  data: Uint8Array;
};

export type BuildPmTilesArchiveOptions = {
  tiles: PmTilesTile[];
  minZoom: number;
  maxZoom: number;
  bounds: PmTilesBounds;
  metadata: Record<string, unknown>;
  centerZoom?: number;
};

type PmTilesDirectoryEntry = {
  tileId: number;
  offset: number;
  length: number;
  runLength: number;
};

const PMTILES_HEADER_SIZE_BYTES = 127;
const PMTILES_ROOT_DIRECTORY_LIMIT_BYTES = 16_384 - PMTILES_HEADER_SIZE_BYTES;
const PMTILES_SPEC_VERSION = 3;
const PMTILES_COMPRESSION_NONE = 1;
const PMTILES_TILE_TYPE_MVT = 1;

function rotate(n: number, x: number, y: number, rx: number, ry: number): [number, number] {
  if (ry === 0) {
    if (rx !== 0) return [n - 1 - y, n - 1 - x];
    return [y, x];
  }

  return [x, y];
}

export function zxyToPmTilesTileId(z: number, x: number, y: number): number {
  if (z > 26) throw new Error('PMTiles tile zoom level exceeds max safe number limit');
  if (x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    throw new Error(`PMTiles tile x/y outside zoom level bounds: z${z}/${x}/${y}`);
  }

  let tileId = ((2 ** z) ** 2 - 1) / 3;
  let level = z - 1;
  let tx = x;
  let ty = y;

  for (let size = 2 ** level; size > 0; size /= 2) {
    const rx = tx & size;
    const ry = ty & size;
    tileId += ((3 * rx) ^ ry) * 2 ** level;
    [tx, ty] = rotate(size, tx, ty, rx, ry);
    level -= 1;
  }

  return tileId;
}

function pushVarint(target: number[], value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`PMTiles varint value must be a non-negative safe integer: ${value}`);
  }

  let nextValue = value;
  while (nextValue >= 0x80) {
    target.push((nextValue % 0x80) | 0x80);
    nextValue = Math.floor(nextValue / 0x80);
  }
  target.push(nextValue);
}

function encodeDirectory(entries: PmTilesDirectoryEntry[]): Buffer {
  if (entries.length === 0) throw new Error('PMTiles directory must contain at least one tile entry');

  const bytes: number[] = [];
  pushVarint(bytes, entries.length);

  let lastTileId = 0;
  for (const entry of entries) {
    pushVarint(bytes, entry.tileId - lastTileId);
    lastTileId = entry.tileId;
  }

  for (const entry of entries) pushVarint(bytes, entry.runLength);
  for (const entry of entries) pushVarint(bytes, entry.length);

  let nextByte = 0;
  entries.forEach((entry, index) => {
    pushVarint(bytes, index > 0 && entry.offset === nextByte ? 0 : entry.offset + 1);
    nextByte = entry.offset + entry.length;
  });

  return Buffer.from(bytes);
}

function writeUInt64LE(buffer: Buffer, value: number, offset: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`PMTiles header value must be a non-negative safe integer: ${value}`);
  }
  buffer.writeBigUInt64LE(BigInt(value), offset);
}

function writeScaledCoordinate(buffer: Buffer, value: number, offset: number): void {
  buffer.writeInt32LE(Math.round(value * 10_000_000), offset);
}

function buildHeader(options: {
  rootDirectoryOffset: number;
  rootDirectoryLength: number;
  jsonMetadataOffset: number;
  jsonMetadataLength: number;
  tileDataOffset: number;
  tileDataLength: number;
  numAddressedTiles: number;
  numTileEntries: number;
  numTileContents: number;
  minZoom: number;
  maxZoom: number;
  bounds: PmTilesBounds;
  centerZoom: number;
}): Buffer {
  const header = Buffer.alloc(PMTILES_HEADER_SIZE_BYTES);
  header.write('PMTiles', 0, 'utf8');
  header.writeUInt8(PMTILES_SPEC_VERSION, 7);
  writeUInt64LE(header, options.rootDirectoryOffset, 8);
  writeUInt64LE(header, options.rootDirectoryLength, 16);
  writeUInt64LE(header, options.jsonMetadataOffset, 24);
  writeUInt64LE(header, options.jsonMetadataLength, 32);
  writeUInt64LE(header, options.tileDataOffset, 40);
  writeUInt64LE(header, 0, 48);
  writeUInt64LE(header, options.tileDataOffset, 56);
  writeUInt64LE(header, options.tileDataLength, 64);
  writeUInt64LE(header, options.numAddressedTiles, 72);
  writeUInt64LE(header, options.numTileEntries, 80);
  writeUInt64LE(header, options.numTileContents, 88);

  header.writeUInt8(1, 96);
  header.writeUInt8(PMTILES_COMPRESSION_NONE, 97);
  header.writeUInt8(PMTILES_COMPRESSION_NONE, 98);
  header.writeUInt8(PMTILES_TILE_TYPE_MVT, 99);
  header.writeUInt8(options.minZoom, 100);
  header.writeUInt8(options.maxZoom, 101);
  writeScaledCoordinate(header, options.bounds.west, 102);
  writeScaledCoordinate(header, options.bounds.south, 106);
  writeScaledCoordinate(header, options.bounds.east, 110);
  writeScaledCoordinate(header, options.bounds.north, 114);
  header.writeUInt8(options.centerZoom, 118);
  writeScaledCoordinate(header, (options.bounds.west + options.bounds.east) / 2, 119);
  writeScaledCoordinate(header, (options.bounds.south + options.bounds.north) / 2, 123);

  return header;
}

export function buildPmTilesArchive(options: BuildPmTilesArchiveOptions): Buffer {
  if (options.tiles.length === 0) throw new Error('Cannot build PMTiles archive without vector tiles');
  if (options.maxZoom < options.minZoom) throw new Error('PMTiles max zoom must be greater than or equal to min zoom');

  const tileRows = options.tiles
    .map((tile) => ({
      ...tile,
      tileId: zxyToPmTilesTileId(tile.z, tile.x, tile.y),
      bytes: Buffer.from(tile.data),
    }))
    .sort((left, right) => left.tileId - right.tileId);

  const seenTileIds = new Set<number>();
  let tileDataOffset = 0;
  const directoryEntries: PmTilesDirectoryEntry[] = [];
  const tileBuffers: Buffer[] = [];

  for (const tile of tileRows) {
    if (seenTileIds.has(tile.tileId)) throw new Error(`Duplicate PMTiles tile id: ${tile.tileId}`);
    seenTileIds.add(tile.tileId);
    directoryEntries.push({
      tileId: tile.tileId,
      offset: tileDataOffset,
      length: tile.bytes.byteLength,
      runLength: 1,
    });
    tileDataOffset += tile.bytes.byteLength;
    tileBuffers.push(tile.bytes);
  }

  const rootDirectoryBytes = encodeDirectory(directoryEntries);
  if (rootDirectoryBytes.byteLength > PMTILES_ROOT_DIRECTORY_LIMIT_BYTES) {
    throw new Error(`PMTiles root directory is too large for a single-directory starter archive: ${rootDirectoryBytes.byteLength} bytes`);
  }

  const jsonMetadataBytes = Buffer.from(JSON.stringify(options.metadata), 'utf8');
  const tileDataBytes = Buffer.concat(tileBuffers);
  const rootDirectoryOffset = PMTILES_HEADER_SIZE_BYTES;
  const jsonMetadataOffset = rootDirectoryOffset + rootDirectoryBytes.byteLength;
  const tileDataSectionOffset = jsonMetadataOffset + jsonMetadataBytes.byteLength;
  const headerBytes = buildHeader({
    rootDirectoryOffset,
    rootDirectoryLength: rootDirectoryBytes.byteLength,
    jsonMetadataOffset,
    jsonMetadataLength: jsonMetadataBytes.byteLength,
    tileDataOffset: tileDataSectionOffset,
    tileDataLength: tileDataBytes.byteLength,
    numAddressedTiles: directoryEntries.length,
    numTileEntries: directoryEntries.length,
    numTileContents: tileBuffers.length,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    bounds: options.bounds,
    centerZoom: options.centerZoom ?? options.minZoom,
  });

  return Buffer.concat([headerBytes, rootDirectoryBytes, jsonMetadataBytes, tileDataBytes]);
}

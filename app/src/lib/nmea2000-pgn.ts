/**
 * NMEA 2000 PGN Decoder
 * PGN definitions from canboat (Apache-2.0)
 */

import pgnDatabase from '@/data/pgn-database.json';

export interface PGNField {
  id: string;
  name: string;
  bitLength: number;
  bitOffset: number;
  resolution?: number;
  signed?: boolean;
  unit?: string;
}

export interface PGNDefinition {
  pgn: number;
  id: string;
  description: string;
  length: number;
  fields: PGNField[];
}

export interface DecodedPGN {
  pgn: number;
  id: string;
  description: string;
  fields: Record<string, number | null>;
  raw: Uint8Array;
}

const pgnMap = new Map<number, PGNDefinition>();
for (const entry of pgnDatabase as PGNDefinition[]) {
  pgnMap.set(entry.pgn, entry);
}

export function lookupPGN(pgn: number): PGNDefinition | null {
  return pgnMap.get(pgn) ?? null;
}

export function extractField(
  data: Uint8Array,
  bitOffset: number,
  bitLength: number,
  signed: boolean,
): number | null {
  if (bitLength === 0 || bitLength > 32) return null;

  const startByte = Math.floor(bitOffset / 8);
  const startBit = bitOffset % 8;

  if (startByte >= data.length) return null;

  let value = 0;
  let bitsRead = 0;

  for (let i = 0; bitsRead < bitLength; i++) {
    const byteIdx = startByte + Math.floor((startBit + i) / 8);
    const bitIdx = (startBit + i) % 8;
    if (byteIdx >= data.length) return null;

    const bit = (data[byteIdx] >> bitIdx) & 1;
    value |= bit << bitsRead;
    bitsRead++;
  }

  const maxUnsigned = (1 << bitLength) - 1;
  if (value === maxUnsigned) return null;

  if (signed && bitLength > 1 && (value & (1 << (bitLength - 1)))) {
    value -= 1 << bitLength;
  }

  return value;
}

export function decodePGN(pgn: number, data: Uint8Array): DecodedPGN | null {
  const def = pgnMap.get(pgn);
  if (!def) return null;

  const fields: Record<string, number | null> = {};

  for (const field of def.fields) {
    const raw = extractField(data, field.bitOffset, field.bitLength, field.signed ?? false);
    if (raw === null) {
      fields[field.id] = null;
      continue;
    }
    fields[field.id] = field.resolution ? raw * field.resolution : raw;
  }

  return { pgn, id: def.id, description: def.description, fields, raw: data };
}

export interface DecodedPosition {
  latitude: number;
  longitude: number;
}

export interface DecodedHeading {
  heading: number;
  reference: string;
}

export interface DecodedDepth {
  depth: number;
  offset: number;
}

export interface DecodedWind {
  speed: number;
  direction: number;
  reference: string;
}

export interface DecodedEngine {
  engineInstance: number;
  rpm: number;
}

export function decodePosition(decoded: DecodedPGN): DecodedPosition | null {
  if (decoded.pgn !== 129025 && decoded.pgn !== 129029) return null;
  const lat = decoded.fields.latitude ?? decoded.fields.lat;
  const lon = decoded.fields.longitude ?? decoded.fields.lon;
  if (lat === null || lon === null) return null;
  return { latitude: lat, longitude: lon };
}

export function decodeHeading(decoded: DecodedPGN): DecodedHeading | null {
  if (decoded.pgn !== 127250) return null;
  const heading = decoded.fields.heading;
  if (heading === null) return null;
  const ref = decoded.fields.reference;
  return { heading: heading * (180 / Math.PI), reference: ref === 0 ? 'true' : 'magnetic' };
}

export function decodeDepth(decoded: DecodedPGN): DecodedDepth | null {
  if (decoded.pgn !== 128267) return null;
  const depth = decoded.fields.depth;
  if (depth === null) return null;
  return { depth, offset: decoded.fields.offset ?? 0 };
}

export function decodeWind(decoded: DecodedPGN): DecodedWind | null {
  if (decoded.pgn !== 130306) return null;
  const speed = decoded.fields.windSpeed;
  const dir = decoded.fields.windAngle ?? decoded.fields.windDirection;
  if (speed === null || dir === null) return null;
  const ref = decoded.fields.reference;
  return {
    speed,
    direction: dir * (180 / Math.PI),
    reference: ref === 0 ? 'true-ground' : ref === 1 ? 'magnetic-ground' : ref === 2 ? 'apparent' : 'true-boat',
  };
}

export function decodeEngine(decoded: DecodedPGN): DecodedEngine | null {
  if (decoded.pgn !== 127488) return null;
  const instance = decoded.fields.engineInstance;
  const speed = decoded.fields.engineSpeed ?? decoded.fields.speed;
  if (instance === null || speed === null) return null;
  return { engineInstance: instance, rpm: speed * 60 };
}

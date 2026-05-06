/**
 * HarborMesh - NMEA 0183/2000 Parser
 * Hardware Integration Layer for Marine Sensors
 */

import { calculateNMEAChecksum } from './utils';

// ============================================================================
// NMEA 0183 TYPES
// ============================================================================

export interface NMEASentence {
  raw: string;
  type: string;
  talker: string;
  fields: string[];
  checksum: string;
  isValid: boolean;
}

export interface GPSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: Date;
  fixQuality: FixQuality;
  satellites: number;
  hdop: number;
}

export enum FixQuality {
  INVALID = 0,
  GPS_FIX = 1,
  DGPS_FIX = 2,
  PPS_FIX = 3,
  RTK_FIX = 4,
  FLOAT_RTK = 5,
  ESTIMATED = 6,
  MANUAL = 7,
  SIMULATED = 8,
}

export interface AISPosition {
  mmsi: string;
  latitude: number;
  longitude: number;
  course: number;
  speed: number;
  heading: number;
  timestamp: Date;
  navigationalStatus: NavigationalStatus;
  messageType: AISMessageType;
}

export enum NavigationalStatus {
  UNDERWAY = 0,
  ANCHORED = 1,
  NOT_UNDER_COMMAND = 2,
  RESTRICTED_MANEUVERABILITY = 3,
  CONSTRAINED_BY_DRAFT = 4,
  MOORED = 5,
  AGROUND = 6,
  FISHING = 7,
  RESERVED = 15,
}

export enum AISMessageType {
  POSITION_REPORT = 1,
  POSITION_REPORT_CLASS_B = 18,
  STATIC_DATA = 5,
  VOYAGE_DATA = 19,
}

export interface DepthData {
  depth: number;
  offset: number;
  timestamp: Date;
}

export interface WindData {
  speed: number;
  direction: number;
  timestamp: Date;
  apparent: boolean;
}

export interface EngineData {
  rpm: number;
  oilPressure: number;
  coolantTemperature: number;
  hours: number;
  fuelRate: number;
  timestamp: Date;
}

export interface TankData {
  type: 'fuel' | 'water' | 'waste' | 'blackwater' | 'greywater';
  level: number;
  capacity: number;
  timestamp: Date;
}

// ============================================================================
// NMEA PARSER
// ============================================================================

/**
 * Parse a raw NMEA sentence
 */
export function parseNMEASentence(raw: string): NMEASentence {
  const trimmed = raw.trim();
  
  // Check for checksum
  const checksumIndex = trimmed.lastIndexOf('*');
  let checksum = '';
  let sentence = trimmed;
  
  if (checksumIndex !== -1) {
    checksum = trimmed.substring(checksumIndex + 1);
    sentence = trimmed.substring(0, checksumIndex);
  }
  
  // Split into fields
  const fields = sentence.split(',');
  const talkerType = fields[0]?.substring(1) || '';
  const talker = talkerType.substring(0, 2);
  const type = talkerType.substring(2);
  
  // Validate checksum if present
  let isValid = true;
  if (checksum) {
    const calculatedChecksum = calculateNMEAChecksum(sentence.substring(1));
    isValid = calculatedChecksum.toLowerCase() === checksum.toLowerCase();
  }
  
  return {
    raw: trimmed,
    type,
    talker,
    fields: fields.slice(1),
    checksum,
    isValid,
  };
}

/**
 * Check if a sentence is a valid NMEA 0183 sentence
 */
export function isValidNMEASentence(raw: string): boolean {
  if (!raw || raw.length < 3) return false;
  if (!raw.startsWith('$')) return false;
  if (!raw.includes('*') && raw.length > 50) return false; // Sentences without checksum should be short
  
  const sentence = parseNMEASentence(raw);
  return sentence.type.length === 3 && sentence.talker.length === 2 && sentence.isValid;
}

// ============================================================================
// GPS PARSING
// ============================================================================

/**
 * Parse GGA sentence (GPS Fix Data)
 */
export function parseGGASentence(sentence: NMEASentence): GPSPosition | null {
  if (sentence.type !== 'GGA') return null;
  
  const fields = sentence.fields;
  if (fields.length < 14) return null;
  
  const lat = parseCoordinate(fields[1], fields[2]);
  const lon = parseCoordinate(fields[3], fields[4]);
  const fixQuality = parseInt(fields[5], 10) as FixQuality;
  const satellites = parseInt(fields[6], 10) || 0;
  const hdop = parseFloat(fields[7]) || 0;
  const altitude = parseFloat(fields[8]) || 0;
  
  // Parse timestamp
  const timeStr = fields[0];
  const now = new Date();
  const hours = parseInt(timeStr.substring(0, 2), 10) || 0;
  const minutes = parseInt(timeStr.substring(2, 4), 10) || 0;
  const seconds = parseFloat(timeStr.substring(4)) || 0;
  
  const timestamp = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hours,
    minutes,
    Math.floor(seconds)
  ));
  
  return {
    latitude: lat,
    longitude: lon,
    altitude,
    timestamp,
    fixQuality,
    satellites,
    hdop,
  };
}

/**
 * Parse RMC sentence (Recommended Minimum Navigation Data)
 */
export function parseRMCSentence(sentence: NMEASentence): {
  position: GPSPosition;
  speed: number;
  course: number;
  valid: boolean;
  date: Date;
} | null {
  if (sentence.type !== 'RMC') return null;
  
  const fields = sentence.fields;
  if (fields.length < 11) return null;
  
  const lat = parseCoordinate(fields[2], fields[3]);
  const lon = parseCoordinate(fields[4], fields[5]);
  const speedKnots = parseFloat(fields[6]) || 0;
  const course = parseFloat(fields[7]) || 0;
  const valid = fields[1] === 'A';
  
  // Parse date (DDMMYY format)
  const dateStr = fields[8];
  const day = parseInt(dateStr.substring(0, 2), 10) || 1;
  const month = parseInt(dateStr.substring(2, 4), 10) || 0;
  const yearPart = parseInt(dateStr.substring(4, 6), 10) || 0;
  const year = yearPart >= 80 ? 1900 + yearPart : 2000 + yearPart;

  const timeStr = fields[0];
  const hours = parseInt(timeStr.substring(0, 2), 10) || 0;
  const minutes = parseInt(timeStr.substring(2, 4), 10) || 0;
  const seconds = parseFloat(timeStr.substring(4)) || 0;
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, Math.floor(seconds)));
  
  return {
    position: {
      latitude: lat,
      longitude: lon,
      altitude: 0,
      timestamp: date,
      fixQuality: valid ? FixQuality.GPS_FIX : FixQuality.INVALID,
      satellites: 0,
      hdop: 0,
    },
    speed: speedKnots * 1.852, // Convert to km/h
    course,
    valid,
    date,
  };
}

/**
 * Parse NMEA coordinate from degrees/minutes format
 */
function parseCoordinate(coordinate: string, direction: string): number {
  if (!coordinate || !direction) return 0;
  
  const isNegative = direction === 'S' || direction === 'W';
  const degreeDigits = direction === 'E' || direction === 'W' ? 3 : 2;
  const degrees = parseInt(coordinate.substring(0, degreeDigits), 10) || 0;
  const minutes = parseFloat(coordinate.substring(degreeDigits)) || 0;
  
  let decimal = degrees + minutes / 60;
  if (isNegative) decimal = -decimal;
  
  return decimal;
}

// ============================================================================
// AIS PARSING
// ============================================================================

/**
 * Parse AIS position report (Message Type 1, 2, 3)
 */
export function parseAISPosition(sentence: NMEASentence): AISPosition | null {
  if (!['VDM', 'VDO'].includes(sentence.type)) return null;
  
  const fields = sentence.fields;
  if (fields.length < 8) return null;
  
  // AIS sentences can be fragmented, so we need to handle multi-sentence messages
  // For now, we handle single-sentence messages
  const payload = fields[5];
  if (!payload || payload.length < 28) return null;
  
  // Decode AIS 6-bit ASCII
  const decoded = decodeAIS6Bit(payload);
  
  // Parse message type (first 6 bits)
  const messageType = (decoded[0] >> 2) & 0x3F;
  
  if (messageType !== 1 && messageType !== 2 && messageType !== 3) {
    return null; // Not a position report
  }
  
  // Parse MMSI (bits 8-37)
  const mmsi = ((decoded[0] & 0x03) << 22) |
               (decoded[1] << 14) |
               (decoded[2] << 6) |
               (decoded[3] >> 2);
  
  // Parse latitude (bits 61-88) - 1/10000 minute
  const latRaw = ((decoded[4] & 0x03) << 28) |
                 (decoded[5] << 20) |
                 (decoded[6] << 12) |
                 (decoded[7] << 4) |
                 (decoded[8] >> 4);
  const latitude = (latRaw / 600000) * (decoded[8] & 0x08 ? -1 : 1);
  
  // Parse longitude (bits 89-116)
  const lonRaw = ((decoded[8] & 0x0F) << 27) |
                 (decoded[9] << 19) |
                 (decoded[10] << 11) |
                 (decoded[11] << 3) |
                 (decoded[12] >> 5);
  const longitude = (lonRaw / 600000) * (decoded[12] & 0x10 ? -1 : 1);
  
  // Parse course (bits 124-133)
  const course = ((decoded[12] & 0x1F) << 5) | (decoded[13] >> 3);
  
  // Parse speed (bits 140-148)
  const speed = ((decoded[13] & 0x07) << 3) | (decoded[14] >> 5);
  
  // Parse heading (bits 137-144)
  const heading = ((decoded[14] & 0x1F) << 3) | (decoded[15] >> 5);
  
  // Parse navigational status (bits 38-41)
  const navigationalStatus = (decoded[1] >> 2) & 0x0F;
  
  return {
    mmsi: mmsi.toString(),
    latitude,
    longitude,
    course,
    speed: speed * 0.1, // Convert to knots
    heading,
    timestamp: new Date(),
    navigationalStatus: navigationalStatus as NavigationalStatus,
    messageType: messageType as AISMessageType,
  };
}

/**
 * Decode AIS 6-bit ASCII to binary
 */
function decodeAIS6Bit(ascii: string): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < ascii.length; i++) {
    const charCode = ascii.charCodeAt(i);
    // AIS uses ASCII 48-119 (0-80 in 6-bit)
    const value = charCode - 48;
    result.push(value > 40 ? value - 40 : value);
  }
  
  return result;
}

// ============================================================================
// DEPTH PARSING
// ============================================================================

/**
 * Parse DBT sentence (Depth Below Transducer)
 */
export function parseDBTSentence(sentence: NMEASentence): DepthData | null {
  if (sentence.type !== 'DBT') return null;
  
  const fields = sentence.fields;
  if (fields.length < 6) return null;
  
  const depthMeters = parseFloat(fields[2]) || 0;
  
  return {
    depth: depthMeters,
    offset: 0,
    timestamp: new Date(),
  };
}

/**
 * Parse DPT sentence (Depth)
 */
export function parseDPTSentence(sentence: NMEASentence): DepthData | null {
  if (sentence.type !== 'DPT') return null;
  
  const fields = sentence.fields;
  if (fields.length < 3) return null;
  
  const depth = parseFloat(fields[0]) || 0;
  const offset = parseFloat(fields[1]) || 0;
  
  return {
    depth,
    offset,
    timestamp: new Date(),
  };
}

// ============================================================================
// WIND PARSING
// ============================================================================

/**
 * Parse MWV sentence (Wind Speed and Angle)
 */
export function parseMWVSentence(sentence: NMEASentence): WindData | null {
  if (sentence.type !== 'MWV') return null;
  
  const fields = sentence.fields;
  if (fields.length < 4) return null;
  
  const angle = parseFloat(fields[0]) || 0;
  const speed = parseFloat(fields[2]) || 0;
  const unit = fields[3];
  const apparent = fields[1] === 'R'; // R = relative (apparent), T = true
  
  // Convert to standard units
  let speedMs = speed;
  if (unit === 'K') {
    speedMs = speed / 3.6; // km/h to m/s
  } else if (unit === 'N') {
    speedMs = speed * 0.514444; // knots to m/s
  }
  
  return {
    speed: speedMs,
    direction: angle,
    timestamp: new Date(),
    apparent,
  };
}

// ============================================================================
// ENGINE DATA PARSING
// ============================================================================

/**
 * Parse RPM sentence (Engine Revolutions)
 */
export function parseRPMSentence(sentence: NMEASentence): {
  engineId: number;
  rpm: number;
  status: string;
} | null {
  if (sentence.type !== 'RPM') return null;
  
  const fields = sentence.fields;
  if (fields.length < 6) return null;
  
  const engineId = parseInt(fields[0], 10) || 1;
  const rpm = parseFloat(fields[4]) || 0;
  const status = fields[5] || '';
  
  return { engineId, rpm, status };
}

/**
 * Parse XDR sentence (Transducer Data)
 */
export function parseXDRSentence(sentence: NMEASentence): {
  type: string;
  value: number;
  unit: string;
  id: string;
}[] {
  if (sentence.type !== 'XDR') return [];
  
  const fields = sentence.fields;
  const results: { type: string; value: number; unit: string; id: string }[] = [];
  
  // XDR has groups of 4 fields
  for (let i = 0; i + 3 < fields.length; i += 4) {
    const type = fields[i];
    const value = parseFloat(fields[i + 1]) || 0;
    const unit = fields[i + 2];
    const id = fields[i + 3];
    
    results.push({ type, value, unit, id });
  }
  
  return results;
}

// ============================================================================
// TANK DATA PARSING
// ============================================================================

/**
 * Parse TLL sentence (Tank Level)
 */
export function parseTLLSentence(sentence: NMEASentence): TankData | null {
  if (sentence.type !== 'TLL') return null;
  
  const fields = sentence.fields;
  if (fields.length < 10) return null;
  
  const tankType = fields[4]?.toLowerCase() || 'fuel';
  const level = parseFloat(fields[5]) || 0;
  const capacity = parseFloat(fields[6]) || 100;
  
  return {
    type: tankType as TankData['type'],
    level,
    capacity,
    timestamp: new Date(),
  };
}

// ============================================================================
// NMEA 2000 (PGN) SUPPORT
// ============================================================================

export interface N2KMessage {
  pgn: number;
  source: number;
  destination: number;
  timestamp: Date;
  fields: Map<number, number | string>;
}

/**
 * Parse NMEA 2000 PGN 129025 (Position, Rapid Update)
 */
export function parseN2KPositionRapid(data: number[]): {
  latitude: number;
  longitude: number;
} | null {
  if (data.length < 8) return null;
  
  // Latitude: 4 bytes, 1e-16 radian
  const latRaw = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  const latitude = (Int32Array.of(latRaw)[0] * 1e-16) * (180 / Math.PI);
  
  // Longitude: 4 bytes, 1e-16 radian
  const lonRaw = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
  const longitude = (Int32Array.of(lonRaw)[0] * 1e-16) * (180 / Math.PI);
  
  return { latitude, longitude };
}

/**
 * Parse NMEA 2000 PGN 127250 (Vessel Heading)
 */
export function parseN2KHeading(data: number[]): {
  heading: number;
  deviation: number;
  variation: number;
} | null {
  if (data.length < 4) return null;
  
  // Heading: 2 bytes, 1e-4 radian
  const headingRaw = (data[0] << 8) | data[1];
  const heading = (headingRaw * 0.0001) * (180 / Math.PI);
  
  // Deviation: 2 bytes, 1e-4 radian
  const deviationRaw = (data[2] << 8) | data[3];
  const deviation = (deviationRaw * 0.0001) * (180 / Math.PI);
  
  // Variation: 2 bytes, 1e-4 radian (at bytes 4-5)
  const variation = data.length >= 6 ? ((data[4] << 8) | data[5]) * 0.0001 * (180 / Math.PI) : 0;
  
  return { heading, deviation, variation };
}

/**
 * Parse NMEA 2000 PGN 128267 (Water Depth)
 */
export function parseN2KDepth(data: number[]): {
  depth: number;
  offset: number;
} | null {
  if (data.length < 4) return null;
  
  // Depth: 4 bytes, 0.001 m
  const depthRaw = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  const depth = (Int32Array.of(depthRaw)[0] * 0.001);
  
  // Offset: 2 bytes, 0.001 m
  const offsetRaw = (data[4] << 8) | data[5];
  const offset = (offsetRaw - 500) * 0.001; // Offset is relative to transducer
  
  return { depth, offset };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export interface NMEABatchResult {
  gps: GPSPosition | null;
  ais: AISPosition[];
  depth: DepthData | null;
  wind: WindData | null;
  engine: { engineId: number; rpm: number }[];
  tanks: TankData[];
  errors: string[];
}

/**
 * Process a batch of NMEA sentences
 */
export function processNMEABatch(sentences: string[]): NMEABatchResult {
  const result: NMEABatchResult = {
    gps: null,
    ais: [],
    depth: null,
    wind: null,
    engine: [],
    tanks: [],
    errors: [],
  };
  
  for (const raw of sentences) {
    try {
      const sentence = parseNMEASentence(raw);
      
      if (!sentence.isValid) {
        result.errors.push(`Invalid checksum: ${raw}`);
        continue;
      }
      
      // Parse GPS
      const gga = parseGGASentence(sentence);
      if (gga) {
        result.gps = gga;
        continue;
      }
      
      const rmc = parseRMCSentence(sentence);
      if (rmc) {
        result.gps = rmc.position;
        continue;
      }
      
      // Parse AIS
      const ais = parseAISPosition(sentence);
      if (ais) {
        result.ais.push(ais);
        continue;
      }
      
      // Parse Depth
      const dbt = parseDBTSentence(sentence);
      if (dbt) {
        result.depth = dbt;
        continue;
      }
      
      const dpt = parseDPTSentence(sentence);
      if (dpt) {
        result.depth = dpt;
        continue;
      }
      
      // Parse Wind
      const mwv = parseMWVSentence(sentence);
      if (mwv) {
        result.wind = mwv;
        continue;
      }
      
      // Parse Engine
      const rpm = parseRPMSentence(sentence);
      if (rpm) {
        result.engine.push(rpm);
        continue;
      }
      
      // Parse Tank
      const tll = parseTLLSentence(sentence);
      if (tll) {
        result.tanks.push(tll);
        continue;
      }
    } catch (error) {
      result.errors.push(`Parse error: ${raw} - ${error}`);
    }
  }
  
  return result;
}

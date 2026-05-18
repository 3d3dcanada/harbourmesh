/**
 * HarborMesh Production NMEA 0183/2000 Parser
 * Ported from SignalK/nmea0183-signalk (Apache-2.0)
 * Browser-native, zero dependencies beyond utils.ts
 */

import { calculateNMEAChecksum } from './utils';

// ============================================================================
// TYPES
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

export interface HeadingData {
  headingTrue?: number;
  headingMagnetic?: number;
  headingCompass?: number;
  magneticVariation?: number;
  magneticDeviation?: number;
  timestamp: Date;
}

export interface SpeedData {
  speedOverGround: number;
  courseOverGround: number;
  speedThroughWater?: number;
  timestamp: Date;
}

export interface BarometricData {
  pressure: number;
  airTemperature?: number;
  waterTemperature?: number;
  humidity?: number;
  dewPoint?: number;
  trueWindDirection?: number;
  trueWindSpeed?: number;
  timestamp: Date;
}

export interface DateTimeData {
  utcDate: Date;
  localOffset: number;
  timestamp: Date;
}

// ============================================================================
// INTERNAL UTILITIES
// ============================================================================

const DEG_TO_RAD = Math.PI / 180;
const KNOTS_TO_MS = 0.514444;
const KPH_TO_MS = 1 / 3.6;
const FEET_TO_M = 0.3048;

function safeFloat(v: string | undefined): number {
  if (!v || v.trim() === '') return NaN;
  return parseFloat(v);
}

function safeInt(v: string | undefined): number {
  if (!v || v.trim() === '') return NaN;
  return parseInt(v, 10);
}

function isEmpty(v: string | undefined): boolean {
  return !v || v.trim() === '';
}

function parseCoordinate(coordinate: string, direction: string): number | null {
  if (!coordinate || !direction || coordinate.trim() === '') return null;
  const isLon = direction === 'E' || direction === 'W';
  const degDigits = isLon ? 3 : 2;
  const deg = parseInt(coordinate.substring(0, degDigits), 10);
  const min = parseFloat(coordinate.substring(degDigits));
  if (isNaN(deg) || isNaN(min)) return null;
  let decimal = deg + min / 60;
  if (direction === 'S' || direction === 'W') decimal = -decimal;
  return decimal;
}

function parseNMEATime(timeStr: string): { hours: number; minutes: number; seconds: number } {
  const h = parseInt(timeStr.substring(0, 2), 10) || 0;
  const m = parseInt(timeStr.substring(2, 4), 10) || 0;
  const s = parseFloat(timeStr.substring(4)) || 0;
  return { hours: h, minutes: m, seconds: s };
}

function buildTimestamp(timeStr: string, dateStr?: string): Date {
  const { hours, minutes, seconds } = parseNMEATime(timeStr);
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let day = now.getUTCDate();

  if (dateStr && dateStr.length >= 6) {
    day = parseInt(dateStr.substring(0, 2), 10) || 1;
    month = (parseInt(dateStr.substring(2, 4), 10) || 1) - 1;
    const yy = parseInt(dateStr.substring(4, 6), 10) || 0;
    year = yy >= 80 ? 1900 + yy : 2000 + yy;
  }

  return new Date(Date.UTC(year, month, day, hours, minutes, Math.floor(seconds)));
}

// ============================================================================
// CORE PARSER
// ============================================================================

export function parseNMEASentence(raw: string): NMEASentence {
  const trimmed = raw.trim();
  const checksumIndex = trimmed.lastIndexOf('*');
  let checksum = '';
  let sentence = trimmed;

  if (checksumIndex !== -1) {
    checksum = trimmed.substring(checksumIndex + 1);
    sentence = trimmed.substring(0, checksumIndex);
  }

  const fields = sentence.split(',');
  const header = fields[0]?.substring(1) || '';

  let talker: string;
  let type: string;

  if (header.charAt(0) === 'P') {
    talker = header.substring(0, 2);
    type = header.substring(header.length - 3);
  } else {
    talker = header.substring(0, 2);
    type = header.substring(2);
  }

  let isValid = true;
  if (checksum) {
    const body = sentence.substring(1);
    const calculated = calculateNMEAChecksum(body);
    isValid = calculated.toLowerCase() === checksum.toLowerCase();
  }

  return { raw: trimmed, type, talker, fields: fields.slice(1), checksum, isValid };
}

export function isValidNMEASentence(raw: string): boolean {
  if (!raw || raw.length < 3 || !raw.startsWith('$')) return false;
  if (!raw.includes('*') && raw.length > 50) return false;
  const s = parseNMEASentence(raw);
  return s.type.length === 3 && s.talker.length === 2 && s.isValid;
}

// ============================================================================
// GPS: GGA, RMC, GLL
// ============================================================================

export function parseGGASentence(sentence: NMEASentence): GPSPosition | null {
  if (sentence.type !== 'GGA') return null;
  const f = sentence.fields;
  if (f.length < 14) return null;

  let emptyCount = 0;
  for (const v of f) { if (isEmpty(v)) emptyCount++; }
  if (emptyCount > 4) return null;

  const lat = parseCoordinate(f[1], f[2]);
  const lon = parseCoordinate(f[3], f[4]);
  if (lat === null || lon === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  return {
    latitude: lat,
    longitude: lon,
    altitude: safeFloat(f[8]) || 0,
    timestamp: buildTimestamp(f[0] || ''),
    fixQuality: (safeInt(f[5]) || 0) as FixQuality,
    satellites: safeInt(f[6]) || 0,
    hdop: safeFloat(f[7]) || 0,
  };
}

export function parseRMCSentence(sentence: NMEASentence): {
  position: GPSPosition;
  speed: number;
  course: number;
  valid: boolean;
  date: Date;
} | null {
  if (sentence.type !== 'RMC') return null;
  const f = sentence.fields;
  if (f.length < 11) return null;

  const valid = f[1] === 'A';
  const lat = parseCoordinate(f[2], f[3]);
  const lon = parseCoordinate(f[4], f[5]);
  const speedKnots = safeFloat(f[6]) || 0;
  const course = safeFloat(f[7]) || 0;
  const date = buildTimestamp(f[0] || '', f[8]);

  return {
    position: {
      latitude: lat ?? 0,
      longitude: lon ?? 0,
      altitude: 0,
      timestamp: date,
      fixQuality: valid ? FixQuality.GPS_FIX : FixQuality.INVALID,
      satellites: 0,
      hdop: 0,
    },
    speed: speedKnots * 1.852,
    course,
    valid,
    date,
  };
}

export function parseGLLSentence(sentence: NMEASentence): GPSPosition | null {
  if (sentence.type !== 'GLL') return null;
  const f = sentence.fields;
  if (f.length < 5) return null;
  if (f[5]?.toLowerCase() === 'v') return null;

  const lat = parseCoordinate(f[0], f[1]);
  const lon = parseCoordinate(f[2], f[3]);
  if (lat === null || lon === null) return null;

  return {
    latitude: lat,
    longitude: lon,
    altitude: 0,
    timestamp: f[4] ? buildTimestamp(f[4]) : new Date(),
    fixQuality: FixQuality.GPS_FIX,
    satellites: 0,
    hdop: 0,
  };
}

// ============================================================================
// DEPTH: DBT, DBS, DPT
// ============================================================================

export function parseDBTSentence(sentence: NMEASentence): DepthData | null {
  if (sentence.type !== 'DBT') return null;
  const f = sentence.fields;
  if (f.length < 6) return null;

  let depth: number;
  const meters = safeFloat(f[2]);
  if (!isNaN(meters)) {
    depth = meters;
  } else {
    const feet = safeFloat(f[0]);
    if (!isNaN(feet)) {
      depth = feet * FEET_TO_M;
    } else {
      return null;
    }
  }

  return { depth, offset: 0, timestamp: new Date() };
}

export function parseDBSSentence(sentence: NMEASentence): DepthData | null {
  if (sentence.type !== 'DBS') return null;
  const f = sentence.fields;
  if (f.length < 6) return null;

  let depth: number;
  const meters = safeFloat(f[2]);
  if (!isNaN(meters)) {
    depth = meters;
  } else {
    const feet = safeFloat(f[0]);
    depth = !isNaN(feet) ? feet * FEET_TO_M : NaN;
  }
  if (isNaN(depth)) return null;

  return { depth, offset: 0, timestamp: new Date() };
}

export function parseDPTSentence(sentence: NMEASentence): DepthData | null {
  if (sentence.type !== 'DPT') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;

  const depth = safeFloat(f[0]);
  if (isNaN(depth)) return null;
  const offset = safeFloat(f[1]) || 0;

  return { depth, offset, timestamp: new Date() };
}

// ============================================================================
// WIND: MWV, MWD, VWR
// ============================================================================

export function parseMWVSentence(sentence: NMEASentence): WindData | null {
  if (sentence.type !== 'MWV') return null;
  const f = sentence.fields;
  if (f.length < 5) return null;
  if (!f[4] || f[4].toUpperCase() !== 'A') return null;

  const angle = safeFloat(f[0]) || 0;
  const rawSpeed = safeFloat(f[2]) || 0;
  const unit = (f[3] || '').toUpperCase();
  const apparent = (f[1] || '').toUpperCase() === 'R';

  let speedMs = rawSpeed;
  if (unit === 'K') speedMs = rawSpeed * KPH_TO_MS;
  else if (unit === 'N') speedMs = rawSpeed * KNOTS_TO_MS;

  return { speed: speedMs, direction: angle, timestamp: new Date(), apparent };
}

export function parseMWDSentence(sentence: NMEASentence): WindData | null {
  if (sentence.type !== 'MWD') return null;
  const f = sentence.fields;
  if (f.length < 8) return null;

  const dirTrue = safeFloat(f[0]);
  const speedKnots = safeFloat(f[4]);
  const speedMs = safeFloat(f[6]);
  const speed = !isNaN(speedMs) ? speedMs : (!isNaN(speedKnots) ? speedKnots * KNOTS_TO_MS : NaN);
  const dir = !isNaN(dirTrue) ? dirTrue : safeFloat(f[2]);
  if (isNaN(speed) || isNaN(dir)) return null;

  return { speed, direction: dir, timestamp: new Date(), apparent: false };
}

export function parseVWRSentence(sentence: NMEASentence): WindData | null {
  if (sentence.type !== 'VWR') return null;
  const f = sentence.fields;
  if (f.length < 8) return null;

  let angle = safeFloat(f[0]) || 0;
  if ((f[1] || '').toUpperCase() === 'L') angle = 360 - angle;

  const knots = safeFloat(f[2]);
  const ms = safeFloat(f[6]);
  const speed = !isNaN(ms) ? ms : (!isNaN(knots) ? knots * KNOTS_TO_MS : 0);

  return { speed, direction: angle, timestamp: new Date(), apparent: true };
}

// ============================================================================
// HEADING: HDG, HDM, HDT
// ============================================================================

export function parseHDGSentence(sentence: NMEASentence): HeadingData | null {
  if (sentence.type !== 'HDG') return null;
  const f = sentence.fields;
  if (f.length < 5) return null;

  const compass = safeFloat(f[0]);
  if (isNaN(compass)) return null;

  const deviation = isEmpty(f[1]) ? 0 : safeFloat(f[1]) * ((f[2] || '') === 'E' ? 1 : -1);
  const variation = isEmpty(f[3]) ? NaN : safeFloat(f[3]) * ((f[4] || '') === 'E' ? 1 : -1);

  const result: HeadingData = {
    headingCompass: compass,
    headingMagnetic: compass + (isNaN(deviation) ? 0 : deviation),
    timestamp: new Date(),
  };

  if (!isNaN(deviation)) result.magneticDeviation = deviation;
  if (!isNaN(variation)) {
    result.magneticVariation = variation;
    result.headingTrue = compass + (isNaN(deviation) ? 0 : deviation) + variation;
  }

  return result;
}

export function parseHDMSentence(sentence: NMEASentence): HeadingData | null {
  if (sentence.type !== 'HDM') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;
  const heading = safeFloat(f[0]);
  if (isNaN(heading)) return null;
  return { headingMagnetic: heading, timestamp: new Date() };
}

export function parseHDTSentence(sentence: NMEASentence): HeadingData | null {
  if (sentence.type !== 'HDT') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;
  const heading = safeFloat(f[0]);
  if (isNaN(heading)) return null;
  return { headingTrue: heading, timestamp: new Date() };
}

// ============================================================================
// SPEED/COURSE: VHW, VTG
// ============================================================================

export function parseVHWSentence(sentence: NMEASentence): SpeedData | null {
  if (sentence.type !== 'VHW') return null;
  const f = sentence.fields;
  if (f.length < 8) return null;

  const headingTrue = safeFloat(f[0]);
  const headingMag = safeFloat(f[2]);
  const speedKnots = safeFloat(f[4]);

  const stw = !isNaN(speedKnots) ? speedKnots * KNOTS_TO_MS : 0;
  const cog = !isNaN(headingTrue) ? headingTrue : (!isNaN(headingMag) ? headingMag : 0);

  return {
    speedOverGround: 0,
    courseOverGround: cog,
    speedThroughWater: stw,
    timestamp: new Date(),
  };
}

export function parseVTGSentence(sentence: NMEASentence): SpeedData | null {
  if (sentence.type !== 'VTG') return null;
  const f = sentence.fields;
  if (f.length < 8) return null;

  if (isEmpty(f[0]) && isEmpty(f[2]) && isEmpty(f[4]) && isEmpty(f[6])) return null;

  let speedMs = 0;
  const kph = safeFloat(f[6]);
  const knots = safeFloat(f[4]);
  if (!isNaN(kph) && kph > 0) speedMs = kph * KPH_TO_MS;
  else if (!isNaN(knots) && knots > 0) speedMs = knots * KNOTS_TO_MS;

  const cogTrue = safeFloat(f[0]);
  const cogMag = safeFloat(f[2]);
  const cog = !isNaN(cogTrue) ? cogTrue : (!isNaN(cogMag) ? cogMag : 0);

  return { speedOverGround: speedMs, courseOverGround: cog, timestamp: new Date() };
}

// ============================================================================
// ENGINE: RPM, XDR
// ============================================================================

export function parseRPMSentence(sentence: NMEASentence): {
  engineId: number;
  rpm: number;
  status: string;
} | null {
  if (sentence.type !== 'RPM') return null;
  const f = sentence.fields;
  if (f.length < 5) return null;

  const source = (f[0] || '').toUpperCase();
  const id = safeInt(f[1]) || 0;
  const rpm = safeFloat(f[2]) || 0;
  const status = f[4] || '';

  return { engineId: source === 'S' ? id : id + 100, rpm, status };
}

export function parseXDRSentence(sentence: NMEASentence): {
  type: string;
  value: number;
  unit: string;
  id: string;
}[] {
  if (sentence.type !== 'XDR') return [];
  const f = sentence.fields;
  const results: { type: string; value: number; unit: string; id: string }[] = [];

  for (let i = 0; i + 3 < f.length; i += 4) {
    results.push({
      type: f[i] || '',
      value: safeFloat(f[i + 1]) || 0,
      unit: f[i + 2] || '',
      id: f[i + 3] || '',
    });
  }
  return results;
}

// ============================================================================
// BAROMETRIC/WEATHER: MDA, MTW
// ============================================================================

export function parseMDASentence(sentence: NMEASentence): BarometricData | null {
  if (sentence.type !== 'MDA') return null;
  const f = sentence.fields;
  if (f.length < 16) return null;

  const pressureInHg = safeFloat(f[0]);
  const pressureBar = safeFloat(f[2]);
  let pressurePa = NaN;
  if (!isNaN(pressureBar)) pressurePa = pressureBar * 100000;
  else if (!isNaN(pressureInHg)) pressurePa = pressureInHg * 3386.39;

  if (isNaN(pressurePa)) return null;

  const result: BarometricData = { pressure: pressurePa, timestamp: new Date() };

  const airTemp = safeFloat(f[4]);
  if (!isNaN(airTemp)) result.airTemperature = (f[5] || '') === 'C' ? airTemp + 273.15 : airTemp;

  const waterTemp = safeFloat(f[6]);
  if (!isNaN(waterTemp)) result.waterTemperature = (f[7] || '') === 'C' ? waterTemp + 273.15 : waterTemp;

  const humidity = safeFloat(f[8]);
  if (!isNaN(humidity)) result.humidity = humidity;

  const dewPt = safeFloat(f[10]);
  if (!isNaN(dewPt)) result.dewPoint = (f[11] || '') === 'C' ? dewPt + 273.15 : dewPt;

  const windDirTrue = safeFloat(f[12]);
  if (!isNaN(windDirTrue)) result.trueWindDirection = windDirTrue;

  const windSpeedKnots = safeFloat(f[16]);
  const windSpeedMs = safeFloat(f[14]);
  if (!isNaN(windSpeedMs)) result.trueWindSpeed = windSpeedMs;
  else if (!isNaN(windSpeedKnots)) result.trueWindSpeed = windSpeedKnots * KNOTS_TO_MS;

  return result;
}

export function parseMTWSentence(sentence: NMEASentence): { temperature: number; timestamp: Date } | null {
  if (sentence.type !== 'MTW') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;
  const temp = safeFloat(f[0]);
  if (isNaN(temp)) return null;
  const kelvin = (f[1] || '') === 'C' ? temp + 273.15 : temp;
  return { temperature: kelvin, timestamp: new Date() };
}

// ============================================================================
// DATE/TIME: ZDA
// ============================================================================

export function parseZDASentence(sentence: NMEASentence): DateTimeData | null {
  if (sentence.type !== 'ZDA') return null;
  const f = sentence.fields;
  if (f.length < 6) return null;

  const { hours, minutes, seconds } = parseNMEATime(f[0] || '');
  const day = safeInt(f[1]) || 1;
  const month = (safeInt(f[2]) || 1) - 1;
  const year = safeInt(f[3]) || new Date().getUTCFullYear();
  const offsetHours = safeInt(f[4]) || 0;
  const offsetMinutes = safeInt(f[5]) || 0;

  return {
    utcDate: new Date(Date.UTC(year, month, day, hours, minutes, Math.floor(seconds))),
    localOffset: offsetHours * 60 + offsetMinutes,
    timestamp: new Date(),
  };
}

// ============================================================================
// ROTATION/RUDDER: ROT, RSA
// ============================================================================

export function parseROTSentence(sentence: NMEASentence): { rateOfTurn: number; valid: boolean; timestamp: Date } | null {
  if (sentence.type !== 'ROT') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;
  const rot = safeFloat(f[0]);
  if (isNaN(rot)) return null;
  return { rateOfTurn: rot * DEG_TO_RAD / 60, valid: (f[1] || '') === 'A', timestamp: new Date() };
}

export function parseRSASentence(sentence: NMEASentence): { rudderAngle: number; valid: boolean; timestamp: Date } | null {
  if (sentence.type !== 'RSA') return null;
  const f = sentence.fields;
  if (f.length < 2) return null;
  const angle = safeFloat(f[0]);
  if (isNaN(angle)) return null;
  return { rudderAngle: angle * DEG_TO_RAD, valid: (f[1] || '') === 'A', timestamp: new Date() };
}

// ============================================================================
// LOG: VLW
// ============================================================================

export function parseVLWSentence(sentence: NMEASentence): {
  tripLog: number;
  totalLog: number;
  timestamp: Date;
} | null {
  if (sentence.type !== 'VLW') return null;
  const f = sentence.fields;
  if (f.length < 4) return null;
  const total = safeFloat(f[0]);
  const trip = safeFloat(f[2]);
  if (isNaN(total) && isNaN(trip)) return null;
  return {
    totalLog: isNaN(total) ? 0 : total * 1852,
    tripLog: isNaN(trip) ? 0 : trip * 1852,
    timestamp: new Date(),
  };
}

// ============================================================================
// AIS: VDM, VDO
// ============================================================================

export function parseAISPosition(sentence: NMEASentence): AISPosition | null {
  if (!['VDM', 'VDO'].includes(sentence.type)) return null;
  const f = sentence.fields;
  if (f.length < 8) return null;

  const payload = f[5];
  if (!payload || payload.length < 28) return null;

  const decoded = decodeAIS6Bit(payload);
  const messageType = (decoded[0] >> 2) & 0x3F;
  if (messageType !== 1 && messageType !== 2 && messageType !== 3) return null;

  const mmsi = ((decoded[0] & 0x03) << 22) |
    (decoded[1] << 14) | (decoded[2] << 6) | (decoded[3] >> 2);

  const latRaw = ((decoded[4] & 0x03) << 28) |
    (decoded[5] << 20) | (decoded[6] << 12) | (decoded[7] << 4) | (decoded[8] >> 4);
  const latitude = (latRaw / 600000) * (decoded[8] & 0x08 ? -1 : 1);

  const lonRaw = ((decoded[8] & 0x0F) << 27) |
    (decoded[9] << 19) | (decoded[10] << 11) | (decoded[11] << 3) | (decoded[12] >> 5);
  const longitude = (lonRaw / 600000) * (decoded[12] & 0x10 ? -1 : 1);

  const course = ((decoded[12] & 0x1F) << 5) | (decoded[13] >> 3);
  const speed = ((decoded[13] & 0x07) << 3) | (decoded[14] >> 5);
  const heading = ((decoded[14] & 0x1F) << 3) | (decoded[15] >> 5);
  const navStatus = (decoded[1] >> 2) & 0x0F;

  return {
    mmsi: mmsi.toString(),
    latitude, longitude,
    course, speed: speed * 0.1, heading,
    timestamp: new Date(),
    navigationalStatus: navStatus as NavigationalStatus,
    messageType: messageType as AISMessageType,
  };
}

function decodeAIS6Bit(ascii: string): number[] {
  const result: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    const v = ascii.charCodeAt(i) - 48;
    result.push(v > 40 ? v - 40 : v);
  }
  return result;
}

// ============================================================================
// TANK: TLL (proprietary tank level)
// ============================================================================

export function parseTLLSentence(sentence: NMEASentence): TankData | null {
  if (sentence.type !== 'TLL') return null;
  const f = sentence.fields;
  if (f.length < 10) return null;

  return {
    type: (f[4]?.toLowerCase() || 'fuel') as TankData['type'],
    level: safeFloat(f[5]) || 0,
    capacity: safeFloat(f[6]) || 100,
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

export function parseN2KPositionRapid(data: number[]): { latitude: number; longitude: number } | null {
  if (data.length < 8) return null;
  const latRaw = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  const latitude = (Int32Array.of(latRaw)[0] * 1e-16) * (180 / Math.PI);
  const lonRaw = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];
  const longitude = (Int32Array.of(lonRaw)[0] * 1e-16) * (180 / Math.PI);
  return { latitude, longitude };
}

export function parseN2KHeading(data: number[]): { heading: number; deviation: number; variation: number } | null {
  if (data.length < 4) return null;
  const heading = ((data[0] << 8) | data[1]) * 0.0001 * (180 / Math.PI);
  const deviation = ((data[2] << 8) | data[3]) * 0.0001 * (180 / Math.PI);
  const variation = data.length >= 6 ? ((data[4] << 8) | data[5]) * 0.0001 * (180 / Math.PI) : 0;
  return { heading, deviation, variation };
}

export function parseN2KDepth(data: number[]): { depth: number; offset: number } | null {
  if (data.length < 4) return null;
  const depthRaw = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3];
  const depth = Int32Array.of(depthRaw)[0] * 0.001;
  const offsetRaw = (data[4] << 8) | data[5];
  const offset = (offsetRaw - 500) * 0.001;
  return { depth, offset };
}

// ============================================================================
// NMEA 2000 PGN FRAME PARSER
// ============================================================================

export { decodePGN, lookupPGN, decodePosition, decodeHeading, decodeDepth, decodeWind, decodeEngine } from './nmea2000-pgn';

// ============================================================================
// SENTENCE DISPATCH TABLE
// ============================================================================

type SentenceHandler = (sentence: NMEASentence) => unknown;

const SENTENCE_HANDLERS: Record<string, SentenceHandler> = {
  GGA: parseGGASentence,
  RMC: parseRMCSentence,
  GLL: parseGLLSentence,
  DBT: parseDBTSentence,
  DBS: parseDBSSentence,
  DPT: parseDPTSentence,
  MWV: parseMWVSentence,
  MWD: parseMWDSentence,
  VWR: parseVWRSentence,
  HDG: parseHDGSentence,
  HDM: parseHDMSentence,
  HDT: parseHDTSentence,
  VHW: parseVHWSentence,
  VTG: parseVTGSentence,
  RPM: parseRPMSentence,
  XDR: parseXDRSentence,
  MDA: parseMDASentence,
  MTW: parseMTWSentence,
  ZDA: parseZDASentence,
  ROT: parseROTSentence,
  RSA: parseRSASentence,
  VLW: parseVLWSentence,
  VDM: parseAISPosition,
  VDO: parseAISPosition,
  TLL: parseTLLSentence,
};

export const SUPPORTED_SENTENCES = Object.keys(SENTENCE_HANDLERS);

export function parseSentenceByType(sentence: NMEASentence): { type: string; data: unknown } | null {
  const handler = SENTENCE_HANDLERS[sentence.type];
  if (!handler) return null;
  const data = handler(sentence);
  if (data === null) return null;
  return { type: sentence.type, data };
}

// ============================================================================
// BATCH PROCESSING (backward-compatible)
// ============================================================================

export interface NMEABatchResult {
  gps: GPSPosition | null;
  ais: AISPosition[];
  depth: DepthData | null;
  wind: WindData | null;
  heading: HeadingData | null;
  speed: SpeedData | null;
  barometric: BarometricData | null;
  engine: { engineId: number; rpm: number }[];
  tanks: TankData[];
  errors: string[];
}

export function processNMEABatch(sentences: string[]): NMEABatchResult {
  const result: NMEABatchResult = {
    gps: null, ais: [], depth: null, wind: null,
    heading: null, speed: null, barometric: null,
    engine: [], tanks: [], errors: [],
  };

  for (const raw of sentences) {
    try {
      const sentence = parseNMEASentence(raw);
      if (!sentence.isValid) {
        result.errors.push(`Invalid checksum: ${raw}`);
        continue;
      }

      const gga = parseGGASentence(sentence);
      if (gga) { result.gps = gga; continue; }

      const rmc = parseRMCSentence(sentence);
      if (rmc) { result.gps = rmc.position; continue; }

      const gll = parseGLLSentence(sentence);
      if (gll) { result.gps = gll; continue; }

      const ais = parseAISPosition(sentence);
      if (ais) { result.ais.push(ais); continue; }

      const dbt = parseDBTSentence(sentence);
      if (dbt) { result.depth = dbt; continue; }

      const dbs = parseDBSSentence(sentence);
      if (dbs) { result.depth = dbs; continue; }

      const dpt = parseDPTSentence(sentence);
      if (dpt) { result.depth = dpt; continue; }

      const mwv = parseMWVSentence(sentence);
      if (mwv) { result.wind = mwv; continue; }

      const mwd = parseMWDSentence(sentence);
      if (mwd) { result.wind = mwd; continue; }

      const vwr = parseVWRSentence(sentence);
      if (vwr) { result.wind = vwr; continue; }

      const hdg = parseHDGSentence(sentence);
      if (hdg) { result.heading = hdg; continue; }

      const hdm = parseHDMSentence(sentence);
      if (hdm) { result.heading = hdm; continue; }

      const hdt = parseHDTSentence(sentence);
      if (hdt) { result.heading = hdt; continue; }

      const vhw = parseVHWSentence(sentence);
      if (vhw) { result.speed = vhw; continue; }

      const vtg = parseVTGSentence(sentence);
      if (vtg) { result.speed = vtg; continue; }

      const mda = parseMDASentence(sentence);
      if (mda) { result.barometric = mda; continue; }

      const rpm = parseRPMSentence(sentence);
      if (rpm) { result.engine.push(rpm); continue; }

      const tll = parseTLLSentence(sentence);
      if (tll) { result.tanks.push(tll); continue; }
    } catch (error) {
      result.errors.push(`Parse error: ${raw} - ${error}`);
    }
  }

  return result;
}

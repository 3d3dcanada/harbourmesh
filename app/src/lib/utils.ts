import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HarborMesh - Utility Functions
 */

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export function formatDate(date: string | Date, _format?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return d.toLocaleDateString('en-US', options);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid date';

  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date, format24h: boolean = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--:--';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !format24h,
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(d);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

export function metersToNauticalMiles(meters: number): number {
  return meters / 1852;
}

export function nauticalMilesToMeters(nm: number): number {
  return nm * 1852;
}

export function knotsToKmh(knots: number): number {
  return knots * 1.852;
}

export function kmhToKnots(kmh: number): number {
  return kmh / 1.852;
}

export function knotsToMs(knots: number): number {
  return knots * 0.514444;
}

export function msToKnots(ms: number): number {
  return ms / 0.514444;
}

// ============================================================================
// MARINE-SPECIFIC UTILITIES
// ============================================================================

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export interface GeoPositionWithAccuracy extends GeoPosition {
  accuracy: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: GeoPosition,
  point2: GeoPosition
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  point1: GeoPosition,
  point2: GeoPosition
): number {
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ((bearing + 360) % 360);
}

/**
 * Format coordinates as degrees/minutes/seconds
 * Accepts undefined values gracefully (returns placeholder)
 */
export function formatCoordinate(value: number | undefined, axis: 'lat' | 'lon'): string;
export function formatCoordinate(
  latitude: number | undefined,
  longitude: number | undefined
): { lat: string; lon: string };
export function formatCoordinate(
  latitude: number | undefined,
  longitudeOrAxis: number | undefined | 'lat' | 'lon'
): string | { lat: string; lon: string } {
  const formatDMS = (decimal: number | undefined, isLatitude: boolean): string => {
    if (decimal == null || isNaN(decimal)) return '--°--\'--.0"';
    const direction = isLatitude
      ? decimal >= 0 ? 'N' : 'S'
      : decimal >= 0 ? 'E' : 'W';
    decimal = Math.abs(decimal);
    const degrees = Math.floor(decimal);
    const minutes = Math.floor((decimal - degrees) * 60);
    const seconds = ((decimal - degrees - minutes / 60) * 3600).toFixed(1);
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  if (longitudeOrAxis === 'lat' || longitudeOrAxis === 'lon') {
    return formatDMS(latitude, longitudeOrAxis === 'lat');
  }

  return {
    lat: formatDMS(latitude, true),
    lon: formatDMS(longitudeOrAxis, false),
  };
}

/**
 * Format heading in degrees with compass cardinal
 * Accepts undefined values gracefully
 */
export function formatHeading(degrees: number | undefined): string {
  if (degrees == null || isNaN(degrees)) return '--° ---';
  const normalized = ((degrees % 360) + 360) % 360;
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return `${normalized.toFixed(0)}° ${cardinals[index]}`;
}

/**
 * Format speed in knots
 * Accepts undefined values gracefully
 */
export function formatSpeed(knots: number | undefined): string {
  if (knots == null || isNaN(knots)) return '-- kn';
  if (knots < 0.1) return '0.0 kn';
  return `${knots.toFixed(1)} kn`;
}

/**
 * Format depth in meters
 * Accepts undefined values gracefully
 */
export function formatDepth(meters: number | undefined): string {
  if (meters == null || isNaN(meters)) return '-- m';
  if (meters <= 0) return '-- m';
  return `${meters.toFixed(1)} m`;
}

/**
 * Format temperature in Celsius
 * Accepts undefined values gracefully
 */
export function formatTemperature(celsius: number | undefined): string {
  if (celsius == null || isNaN(celsius)) return '--°C';
  return `${celsius.toFixed(1)}°C`;
}

/**
 * Truncate a string to a max length with ellipsis
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Format distance in nautical miles or meters
 */
export function formatDistance(meters: number | undefined): string {
  if (meters == null || isNaN(meters)) return '--';
  if (meters >= 1852) {
    return `${(meters / 1852).toFixed(1)} nm`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Calculate NMEA checksum for a sentence
 */
export function calculateNMEAChecksum(sentence: string): string {
  let checksum = 0;
  for (let i = 0; i < sentence.length; i++) {
    checksum ^= sentence.charCodeAt(i);
  }
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Parse NMEA GGA sentence (GPS fix data)
 */
export function parseNMEAGGA(sentence: string): {
  latitude: number;
  longitude: number;
  fixQuality: number;
  satellites: number;
  altitude: number;
} | null {
  const parts = sentence.split(',');
  if (parts[0] !== '$GPGGA' || parts.length < 15) return null;

  const lat = parseNMEACoordinate(parts[2], parts[3]);
  const lon = parseNMEACoordinate(parts[4], parts[5]);

  return {
    latitude: lat,
    longitude: lon,
    fixQuality: parseInt(parts[6], 10) || 0,
    satellites: parseInt(parts[7], 10) || 0,
    altitude: parseFloat(parts[9]) || 0,
  };
}

/**
 * Parse NMEA coordinate from degrees/minutes format
 */
function parseNMEACoordinate(
  coordinate: string,
  direction: string
): number {
  if (!coordinate || !direction) return 0;

  const isNegative = direction === 'S' || direction === 'W';
  const degreeDigits = direction === 'E' || direction === 'W' ? 3 : 2;
  const degrees = parseInt(coordinate.substring(0, degreeDigits), 10);
  const minutes = parseFloat(coordinate.substring(degreeDigits));

  let decimal = degrees + minutes / 60;
  if (isNegative) decimal = -decimal;

  return decimal;
}

/**
 * Parse NMEA RMC sentence (recommended minimum navigation data)
 */
export function parseNMEARMC(sentence: string): {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  date: Date;
  valid: boolean;
} | null {
  const parts = sentence.split(',');
  if (parts[0] !== '$GPRMC' || parts.length < 12) return null;

  const lat = parseNMEACoordinate(parts[3], parts[4]);
  const lon = parseNMEACoordinate(parts[5], parts[6]);
  const speedKnots = parseFloat(parts[7]) || 0;
  const course = parseFloat(parts[8]) || 0;
  const valid = parts[2] === 'A';

  // Parse date (DDMMYY format)
  const dateStr = parts[9];
  const day = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10) - 1;
  const yearPart = parseInt(dateStr.substring(4, 6), 10);
  const year = yearPart >= 80 ? 1900 + yearPart : 2000 + yearPart;

  return {
    latitude: lat,
    longitude: lon,
    speed: speedKnots * 1.852, // Convert to km/h
    course,
    date: new Date(Date.UTC(year, month, day)),
    valid,
  };
}

// ============================================================================
// GENERAL UTILITIES
// ============================================================================

/**
 * Generate a unique ID
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate MMSI number (Maritime Mobile Service Identity)
 */
export function isValidMMSI(mmsi: string): boolean {
  if (!/^\d{9}$/.test(mmsi)) return false;

  // MID (first 3 digits) must be valid
  const mid = parseInt(mmsi.substring(0, 3), 10);
  return mid >= 200 && mid <= 999;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }

  throw lastError;
}

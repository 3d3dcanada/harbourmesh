import { describe, expect, it } from 'vitest';
import { calculateNMEAChecksum } from './utils';
import {
  FixQuality,
  isValidNMEASentence,
  parseDBTSentence,
  parseGGASentence,
  parseNMEASentence,
  parseRMCSentence,
  processNMEABatch,
} from './nmea';

function sentence(body: string): string {
  return `$${body}*${calculateNMEAChecksum(body)}`;
}

describe('NMEA parser regressions', () => {
  it('parses longitude with three degree digits in GGA sentences', () => {
    const parsed = parseNMEASentence(sentence('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,'));
    const position = parseGGASentence(parsed);

    expect(parsed.isValid).toBe(true);
    expect(position).toMatchObject({
      latitude: 48.1173,
      longitude: 11.516666666666667,
      fixQuality: FixQuality.GPS_FIX,
      satellites: 8,
    });
  });

  it('parses western longitudes and 1990s RMC dates without rolling into 2094', () => {
    const parsed = parseNMEASentence(sentence('GPRMC,235947,A,5540.123,N,01231.456,W,5.5,84.4,230394,003.1,W'));
    const rmc = parseRMCSentence(parsed);

    expect(parsed.isValid).toBe(true);
    expect(rmc?.valid).toBe(true);
    expect(rmc?.position.longitude).toBeCloseTo(-12.5242666667, 8);
    expect(rmc?.date.toISOString()).toBe('1994-03-23T23:59:47.000Z');
    expect(rmc?.position.timestamp.toISOString()).toBe('1994-03-23T23:59:47.000Z');
  });

  it('rejects checksum failures before batch processing', () => {
    const invalid = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*00';

    expect(parseNMEASentence(invalid).isValid).toBe(false);
    expect(isValidNMEASentence(invalid)).toBe(false);
    expect(processNMEABatch([invalid])).toMatchObject({
      gps: null,
      errors: [expect.stringContaining('Invalid checksum')],
    });
  });

  it('parses DBT meter depth without treating fathoms as transducer offset', () => {
    const parsed = parseNMEASentence(sentence('SDDBT,036.41,f,011.10,M,005.99,F'));
    const depth = parseDBTSentence(parsed);

    expect(parsed.isValid).toBe(true);
    expect(depth).toMatchObject({
      depth: 11.1,
      offset: 0,
    });
  });
});

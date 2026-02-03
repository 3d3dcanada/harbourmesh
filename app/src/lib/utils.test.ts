/**
 * HarborMesh - Utility Functions Tests
 * Zero-Tolerance Quality Assurance - Functional Testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatDuration,
  metersToFeet,
  feetToMeters,
  metersToNauticalMiles,
  nauticalMilesToMeters,
  knotsToKmh,
  kmhToKnots,
} from './utils';

describe('cn (className utility)', () => {
  it('should combine class names correctly', () => {
    expect(cn('base', 'active')).toBe('base active');
  });

  it('should handle conditional classes', () => {
    const condition = true;
    expect(cn('base', condition && 'conditional')).toBe('base conditional');
  });

  it('should merge tailwind classes', () => {
    expect(cn('px-4 py-2', 'bg-blue-500')).toBe('px-4 py-2 bg-blue-500');
  });

  it('should handle empty inputs', () => {
    expect(cn('', 'test', '')).toBe('test');
  });
});

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    expect(formatDate(date)).toContain('Jan');
    expect(formatDate(date)).toContain('15');
    expect(formatDate(date)).toContain('2024');
  });

  it('should handle string input', () => {
    expect(formatDate('2024-01-15')).toBeDefined();
  });

  it('should return invalid date for bad input', () => {
    expect(formatDate('invalid')).toBe('Invalid date');
  });
});

describe('formatDateTime', () => {
  it('should format date and time correctly', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateTime(date);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
    // Timezone-agnostic test - just check format
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatTime', () => {
  it('should format time in 24h format by default', () => {
    const date = new Date('2024-01-15T14:30:00Z');
    const formatted = formatTime(date);
    // Should contain time in some format
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should format time in 12h format when requested', () => {
    const date = new Date('2024-01-15T14:30:00Z');
    const formatted = formatTime(date, false);
    // Should contain AM or PM in 12h format
    expect(formatted).toMatch(/AM|PM/);
  });
});

describe('formatRelativeTime', () => {
  it('should show just now for recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('should show minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toContain('m ago');
  });

  it('should show hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toContain('h ago');
  });

  it('should show days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toContain('d ago');
  });
});

describe('formatDuration', () => {
  it('should format minutes only', () => {
    expect(formatDuration(30)).toBe('30 min');
  });

  it('should format hours only', () => {
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(150)).toBe('2 hr 30 min');
  });
});

describe('Unit Conversions', () => {
  describe('metersToFeet', () => {
    it('should convert meters to feet', () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
      expect(metersToFeet(10)).toBeCloseTo(32.8084, 4);
    });
  });

  describe('feetToMeters', () => {
    it('should convert feet to meters', () => {
      expect(feetToMeters(3.28084)).toBeCloseTo(1, 4);
      expect(feetToMeters(32.8084)).toBeCloseTo(10, 4);
    });
  });

  describe('metersToNauticalMiles', () => {
    it('should convert meters to nautical miles', () => {
      expect(metersToNauticalMiles(1852)).toBe(1);
      expect(metersToNauticalMiles(3704)).toBe(2);
    });
  });

  describe('nauticalMilesToMeters', () => {
    it('should convert nautical miles to meters', () => {
      expect(nauticalMilesToMeters(1)).toBe(1852);
      expect(nauticalMilesToMeters(2)).toBe(3704);
    });
  });

  describe('knotsToKmh', () => {
    it('should convert knots to km/h', () => {
      expect(knotsToKmh(1)).toBe(1.852);
      expect(knotsToKmh(10)).toBe(18.52);
    });
  });

  describe('kmhToKnots', () => {
    it('should convert km/h to knots', () => {
      expect(kmhToKnots(1.852)).toBeCloseTo(1, 4);
      expect(kmhToKnots(18.52)).toBeCloseTo(10, 4);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { formatTelemetryAge, getTelemetryHealth } from './telemetry-health';
import type { TelemetryMessage } from '@/types';

function message(
  messageType: TelemetryMessage['messageType'],
  timestamp: string,
  receivedAt?: string
): TelemetryMessage {
  return {
    id: `${messageType}-${timestamp}`,
    vesselId: 'vessel-1',
    sourceDeviceId: 'boat-node-1',
    timestamp,
    receivedAt,
    messageType,
    payload: {},
  } as TelemetryMessage;
}

describe('telemetry health', () => {
  it('classifies channels as fresh, stale, or missing from message age', () => {
    const health = getTelemetryHealth([
      message('position', '2026-05-06T13:00:50.000Z'),
      message('environment', '2026-05-06T13:00:20.000Z'),
      message('engine', '2026-05-06T12:58:00.000Z'),
    ], new Date('2026-05-06T13:01:00.000Z'));

    expect(health).toEqual([
      expect.objectContaining({ channel: 'position', status: 'fresh', ageSeconds: 10 }),
      expect.objectContaining({ channel: 'environment', status: 'stale', ageSeconds: 40 }),
      expect.objectContaining({ channel: 'ais', status: 'missing', ageSeconds: undefined }),
      expect.objectContaining({ channel: 'engine', status: 'missing', ageSeconds: 180 }),
    ]);
  });

  it('formats telemetry ages for compact instrument panels', () => {
    expect(formatTelemetryAge(undefined)).toBe('no data');
    expect(formatTelemetryAge(0.2)).toBe('now');
    expect(formatTelemetryAge(12.9)).toBe('12s ago');
    expect(formatTelemetryAge(125)).toBe('2m ago');
  });

  it('uses receivedAt for feed health while preserving observed timestamps', () => {
    const health = getTelemetryHealth([
      message('position', '2026-05-06T12:00:00.000Z', '2026-05-06T13:00:58.000Z'),
    ], new Date('2026-05-06T13:01:00.000Z'));

    expect(health[0]).toMatchObject({
      channel: 'position',
      status: 'fresh',
      ageSeconds: 2,
    });
  });
});

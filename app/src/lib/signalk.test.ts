import { describe, expect, it } from 'vitest';
import { buildSignalKStreamUrl, mapSignalKDeltaToTelemetry, type SignalKDelta } from './signalk';
import { RECORDED_NB_SIGNALK_DELTAS, mapRecordedSignalKDelta } from './signalk-replay';

describe('Signal K mapping', () => {
  it('builds the standard Signal K v1 WebSocket stream URL', () => {
    expect(buildSignalKStreamUrl('http://192.168.1.10:3000', 'self')).toBe(
      'ws://192.168.1.10:3000/signalk/v1/stream?subscribe=self&sendCachedValues=true'
    );
    expect(buildSignalKStreamUrl('https://boat-node.local', 'all')).toBe(
      'wss://boat-node.local/signalk/v1/stream?subscribe=all&sendCachedValues=true'
    );
  });

  it('maps self vessel navigation, environment, and engine deltas', () => {
    let id = 0;
    const delta: SignalKDelta = {
      context: 'vessels.self',
      updates: [
        {
          timestamp: '2026-05-06T12:00:00.000Z',
          source: { label: 'recorded-signalk' },
          values: [
            { path: 'navigation.position', value: { latitude: 45.2733, longitude: -66.0633, altitude: 2 } },
            { path: 'navigation.courseOverGroundTrue', value: Math.PI / 2 },
            { path: 'navigation.speedOverGround', value: 5 },
            { path: 'navigation.headingTrue', value: Math.PI },
            { path: 'environment.depth.belowTransducer', value: 12.4 },
            { path: 'environment.water.temperature', value: 285.15 },
            { path: 'environment.wind.speedTrue', value: 4 },
            { path: 'environment.wind.directionTrue', value: Math.PI / 4 },
            { path: 'environment.outside.pressure', value: 101325 },
            { path: 'propulsion.main.revolutions', value: 30 },
            { path: 'propulsion.main.temperature', value: 360.15 },
            { path: 'propulsion.main.runTime', value: 7200 },
          ],
        },
      ],
    };

    const messages = mapSignalKDeltaToTelemetry(delta, {
      idFactory: () => `msg-${++id}`,
      vesselId: 'test-vessel',
    });

    expect(messages.map((message) => message.messageType)).toEqual(['position', 'motion', 'environment', 'engine']);

    const position = messages[0].payload as { latitude: number; longitude: number; cog: number; sog: number };
    expect(position.latitude).toBe(45.2733);
    expect(position.longitude).toBe(-66.0633);
    expect(position.cog).toBe(90);
    expect(position.sog).toBeCloseTo(9.719, 3);

    const motion = messages[1].payload as { yaw: number };
    expect(motion.yaw).toBe(180);

    const environment = messages[2].payload as { depthBelowTransducer: number; waterTemperature: number; windSpeed: number; windDirection: number; barometricPressure: number };
    expect(environment.depthBelowTransducer).toBe(12.4);
    expect(environment.waterTemperature).toBe(12);
    expect(environment.windSpeed).toBeCloseTo(7.775, 3);
    expect(environment.windDirection).toBe(45);
    expect(environment.barometricPressure).toBe(1013.25);

    const engine = messages[3].payload as { engineId: string; rpm: number; temperature: number; runtimeHours: number };
    expect(engine.engineId).toBe('main');
    expect(engine.rpm).toBe(1800);
    expect(engine.temperature).toBe(87);
    expect(engine.runtimeHours).toBe(2);
  });

  it('maps AIS target deltas from non-self MMSI contexts', () => {
    const messages = mapSignalKDeltaToTelemetry({
      context: 'vessels.urn:mrn:imo:mmsi:316123456',
      updates: [
        {
          timestamp: '2026-05-06T12:01:00.000Z',
          values: [
            { path: 'name', value: 'Target Vessel' },
            { path: 'navigation.position', value: { latitude: 45.28, longitude: -66.04 } },
            { path: 'navigation.courseOverGroundTrue', value: Math.PI },
            { path: 'navigation.speedOverGround', value: 2 },
          ],
        },
      ],
    }, {
      idFactory: () => 'ais-1',
      receivedAt: '2026-05-06T12:01:00.000Z',
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].messageType).toBe('ais');
    expect(messages[0].payload).toMatchObject({
      mmsi: '316123456',
      name: 'Target Vessel',
      position: { latitude: 45.28, longitude: -66.04 },
      cog: 180,
    });
  });

  it('keeps a recorded New Brunswick replay available for hardware-free testing', () => {
    expect(RECORDED_NB_SIGNALK_DELTAS.length).toBeGreaterThanOrEqual(3);
    expect(mapRecordedSignalKDelta(0, { idFactory: () => 'replay-1' }).length).toBeGreaterThan(0);
  });
});

import { mapSignalKDeltaToTelemetry, type SignalKDelta, type SignalKMappingOptions } from './signalk';

export const RECORDED_NB_SIGNALK_DELTAS: SignalKDelta[] = [
  {
    context: 'vessels.self',
    updates: [
      {
        timestamp: '2026-05-06T12:00:00.000Z',
        source: { label: 'nb-replay-gps-depth' },
        values: [
          { path: 'navigation.position', value: { latitude: 45.2733, longitude: -66.0633, altitude: 2 } },
          { path: 'navigation.courseOverGroundTrue', value: 1.22173 },
          { path: 'navigation.speedOverGround', value: 3.6 },
          { path: 'navigation.headingTrue', value: 1.39626 },
          { path: 'environment.depth.belowTransducer', value: 13.2 },
          { path: 'environment.water.temperature', value: 284.15 },
          { path: 'environment.wind.speedTrue', value: 5.4 },
          { path: 'environment.wind.directionTrue', value: 0.872665 },
          { path: 'environment.outside.pressure', value: 101140 },
        ],
      },
    ],
  },
  {
    context: 'vessels.self',
    updates: [
      {
        timestamp: '2026-05-06T12:00:02.000Z',
        source: { label: 'nb-replay-attitude-engine' },
        values: [
          { path: 'navigation.position', value: { latitude: 45.275, longitude: -66.0598, altitude: 2 } },
          { path: 'navigation.courseOverGroundTrue', value: 1.23918 },
          { path: 'navigation.speedOverGround', value: 3.9 },
          { path: 'navigation.headingTrue', value: 1.41372 },
          { path: 'navigation.attitude', value: { roll: 0.05236, pitch: -0.01745, yaw: 1.41372 } },
          { path: 'propulsion.main.revolutions', value: 28.5 },
          { path: 'propulsion.main.temperature', value: 358.15 },
          { path: 'propulsion.main.runTime', value: 4518120 },
        ],
      },
    ],
  },
  {
    context: 'vessels.urn:mrn:imo:mmsi:316123456',
    updates: [
      {
        timestamp: '2026-05-06T12:00:03.000Z',
        source: { label: 'nb-replay-ais' },
        values: [
          { path: 'name', value: 'NB Pilot Target' },
          { path: 'navigation.position', value: { latitude: 45.283, longitude: -66.041 } },
          { path: 'navigation.courseOverGroundTrue', value: 3.05433 },
          { path: 'navigation.speedOverGround', value: 2.1 },
        ],
      },
    ],
  },
];

export function getRecordedSignalKDelta(index: number): SignalKDelta {
  return RECORDED_NB_SIGNALK_DELTAS[index % RECORDED_NB_SIGNALK_DELTAS.length];
}

export function mapRecordedSignalKDelta(index: number, options: SignalKMappingOptions = {}) {
  return mapSignalKDeltaToTelemetry(getRecordedSignalKDelta(index), options);
}

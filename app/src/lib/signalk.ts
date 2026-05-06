import { TelemetryMessageType } from '@/types';
import type {
  AISPayload,
  EnginePayload,
  EnvironmentPayload,
  MotionPayload,
  PositionPayload,
  TelemetryMessage,
} from '@/types';

type SignalKValue = {
  path: string;
  value: unknown;
};

type SignalKUpdate = {
  timestamp?: string;
  source?: {
    label?: string;
    type?: string;
    src?: string;
  };
  values?: SignalKValue[];
};

export type SignalKDelta = {
  context?: string;
  updates?: SignalKUpdate[];
  timestamp?: string;
};

type SignalKPositionValue = {
  latitude: number;
  longitude: number;
  altitude?: number;
};

export type SignalKMappingOptions = {
  vesselId?: string;
  sourceDeviceId?: string;
  idFactory?: () => string;
  receivedAt?: string;
};

const MPS_TO_KNOTS = 1.9438444924406;
const RAD_TO_DEG = 180 / Math.PI;

let fallbackId = 0;

function defaultIdFactory(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  fallbackId += 1;
  return `signalk-${Date.now()}-${fallbackId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positionValue(value: unknown): SignalKPositionValue | undefined {
  if (!isRecord(value)) return undefined;

  const latitude = numberValue(value.latitude);
  const longitude = numberValue(value.longitude);

  if (latitude === undefined || longitude === undefined) return undefined;

  return {
    latitude,
    longitude,
    altitude: numberValue(value.altitude),
  };
}

function radiansToDegrees(value: unknown): number | undefined {
  const radians = numberValue(value);
  if (radians === undefined) return undefined;

  return ((radians * RAD_TO_DEG) % 360 + 360) % 360;
}

function radiansToSignedDegrees(value: unknown): number | undefined {
  const radians = numberValue(value);
  return radians === undefined ? undefined : radians * RAD_TO_DEG;
}

function metersPerSecondToKnots(value: unknown): number | undefined {
  const metersPerSecond = numberValue(value);
  return metersPerSecond === undefined ? undefined : metersPerSecond * MPS_TO_KNOTS;
}

function kelvinToCelsius(value: unknown): number | undefined {
  const kelvin = numberValue(value);
  return kelvin === undefined ? undefined : kelvin - 273.15;
}

function pascalToHpa(value: unknown): number | undefined {
  const pascal = numberValue(value);
  return pascal === undefined ? undefined : pascal / 100;
}

function getUpdateTimestamp(delta: SignalKDelta, update: SignalKUpdate, fallback: string): string {
  return update.timestamp || delta.timestamp || fallback;
}

function getSourceDeviceId(update: SignalKUpdate, fallback: string): string {
  return update.source?.label || update.source?.src || update.source?.type || fallback;
}

function getMmsiFromContext(context: string | undefined): string | undefined {
  const match = context?.match(/mmsi:(\d+)/i);
  return match?.[1];
}

function hasAny(values: Map<string, unknown>, paths: string[]): boolean {
  return paths.some((path) => values.has(path));
}

function createMessage(
  type: TelemetryMessage['messageType'],
  payload: TelemetryMessage['payload'],
  delta: SignalKDelta,
  update: SignalKUpdate,
  options: Required<SignalKMappingOptions>
): TelemetryMessage {
  return {
    id: options.idFactory(),
    vesselId: options.vesselId,
    sourceDeviceId: getSourceDeviceId(update, options.sourceDeviceId),
    timestamp: getUpdateTimestamp(delta, update, options.receivedAt),
    messageType: type,
    payload,
    confidence: 0.9,
  };
}

function mapPosition(values: Map<string, unknown>): PositionPayload | null {
  const position = positionValue(values.get('navigation.position'));
  if (!position) return null;

  return {
    latitude: position.latitude,
    longitude: position.longitude,
    altitude: position.altitude,
    accuracy: numberValue(values.get('navigation.gnss.horizontalDilution')),
    cog: radiansToDegrees(values.get('navigation.courseOverGroundTrue')) ?? 0,
    sog: metersPerSecondToKnots(values.get('navigation.speedOverGround')) ?? 0,
    fixType: '3d',
  };
}

function mapMotion(values: Map<string, unknown>): MotionPayload | null {
  const attitude = isRecord(values.get('navigation.attitude')) ? values.get('navigation.attitude') as Record<string, unknown> : null;
  const roll = attitude ? radiansToSignedDegrees(attitude.roll) : undefined;
  const pitch = attitude ? radiansToSignedDegrees(attitude.pitch) : undefined;
  const yaw = attitude ? radiansToDegrees(attitude.yaw) : undefined;
  const heading = radiansToDegrees(values.get('navigation.headingTrue'));

  if (roll === undefined && pitch === undefined && yaw === undefined && heading === undefined) return null;

  return {
    roll: roll ?? 0,
    pitch: pitch ?? 0,
    yaw: yaw ?? heading ?? 0,
  };
}

function mapEnvironment(values: Map<string, unknown>): EnvironmentPayload | null {
  const payload: EnvironmentPayload = {};

  payload.depth = numberValue(values.get('environment.depth.belowSurface'));
  payload.depthBelowKeel = numberValue(values.get('environment.depth.belowKeel'));
  payload.depthBelowTransducer = numberValue(values.get('environment.depth.belowTransducer'));
  payload.waterTemperature = kelvinToCelsius(values.get('environment.water.temperature'));
  payload.windSpeed = metersPerSecondToKnots(values.get('environment.wind.speedTrue'));
  payload.windDirection = radiansToDegrees(values.get('environment.wind.directionTrue'));
  payload.windSpeedApparent = metersPerSecondToKnots(values.get('environment.wind.speedApparent'));
  payload.windDirectionApparent = radiansToDegrees(values.get('environment.wind.angleApparent'));
  payload.barometricPressure = pascalToHpa(values.get('environment.outside.pressure'));
  payload.airTemperature = kelvinToCelsius(values.get('environment.outside.temperature'));
  payload.humidity = numberValue(values.get('environment.outside.relativeHumidity'));

  if (Object.values(payload).every((value) => value === undefined)) return null;

  return payload;
}

function mapEngine(values: Map<string, unknown>): EnginePayload | null {
  const enginePath = [...values.keys()].find((path) => path.startsWith('propulsion.'));
  if (!enginePath) return null;

  const engineId = enginePath.split('.')[1] || 'main';

  return {
    engineId,
    rpm: numberValue(values.get(`propulsion.${engineId}.revolutions`)) !== undefined
      ? numberValue(values.get(`propulsion.${engineId}.revolutions`))! * 60
      : undefined,
    temperature: kelvinToCelsius(values.get(`propulsion.${engineId}.temperature`)),
    oilPressure: pascalToHpa(values.get(`propulsion.${engineId}.oilPressure`)),
    fuelRate: numberValue(values.get(`propulsion.${engineId}.fuel.rate`)),
    coolantTemperature: kelvinToCelsius(values.get(`propulsion.${engineId}.coolantTemperature`)),
    alternatorVoltage: numberValue(values.get(`propulsion.${engineId}.alternatorVoltage`)),
    runtimeHours: (numberValue(values.get(`propulsion.${engineId}.runTime`)) ?? 0) / 3600,
    alarms: [],
  };
}

function mapAis(values: Map<string, unknown>, context: string | undefined): AISPayload | null {
  const mmsi = getMmsiFromContext(context);
  const position = positionValue(values.get('navigation.position'));
  if (!mmsi || !position) return null;

  return {
    mmsi,
    name: typeof values.get('name') === 'string' ? values.get('name') as string : undefined,
    position: {
      latitude: position.latitude,
      longitude: position.longitude,
    },
    cog: radiansToDegrees(values.get('navigation.courseOverGroundTrue')) ?? 0,
    sog: metersPerSecondToKnots(values.get('navigation.speedOverGround')) ?? 0,
    heading: radiansToDegrees(values.get('navigation.headingTrue')),
    timestamp: new Date().toISOString(),
  };
}

export function buildSignalKStreamUrl(baseUrl: string, subscribe: 'self' | 'all' | 'none' = 'self'): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  url.pathname = '/signalk/v1/stream';
  url.search = '';
  url.searchParams.set('subscribe', subscribe);
  url.searchParams.set('sendCachedValues', 'true');
  return url.toString();
}

export function mapSignalKDeltaToTelemetry(
  delta: SignalKDelta,
  options: SignalKMappingOptions = {}
): TelemetryMessage[] {
  const resolvedOptions: Required<SignalKMappingOptions> = {
    vesselId: options.vesselId ?? 'vessels.self',
    sourceDeviceId: options.sourceDeviceId ?? 'signalk',
    idFactory: options.idFactory ?? defaultIdFactory,
    receivedAt: options.receivedAt ?? new Date().toISOString(),
  };

  const messages: TelemetryMessage[] = [];

  for (const update of delta.updates ?? []) {
    const values = new Map((update.values ?? []).map((entry) => [entry.path, entry.value]));
    const mmsi = getMmsiFromContext(delta.context);

    if (mmsi) {
      const ais = mapAis(values, delta.context);
      if (ais) messages.push(createMessage(TelemetryMessageType.AIS, ais, delta, update, resolvedOptions));
      continue;
    }

    const position = mapPosition(values);
    if (position) messages.push(createMessage(TelemetryMessageType.POSITION, position, delta, update, resolvedOptions));

    const motion = mapMotion(values);
    if (motion) messages.push(createMessage(TelemetryMessageType.MOTION, motion, delta, update, resolvedOptions));

    if (hasAny(values, [
      'environment.depth.belowSurface',
      'environment.depth.belowKeel',
      'environment.depth.belowTransducer',
      'environment.water.temperature',
      'environment.wind.speedTrue',
      'environment.wind.directionTrue',
      'environment.outside.pressure',
    ])) {
      const environment = mapEnvironment(values);
      if (environment) messages.push(createMessage(TelemetryMessageType.ENVIRONMENT, environment, delta, update, resolvedOptions));
    }

    const engine = mapEngine(values);
    if (engine) messages.push(createMessage(TelemetryMessageType.ENGINE, engine, delta, update, resolvedOptions));
  }

  return messages;
}

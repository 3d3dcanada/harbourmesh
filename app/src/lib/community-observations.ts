import {
  SharePositionLevel,
  TelemetryMessageType,
  type AISPayload,
  type ConsentSettings,
  type EnvironmentPayload,
  type HealthPayload,
  type MotionPayload,
  type PositionPayload,
  type TelemetryMessage,
  type WeatherPayload,
} from '@/types';

export type CommunityObservationSourceProtocol = 'signalk' | 'nmea0183' | 'nmea2000' | 'manual' | 'replay' | 'simulated' | 'phone';
export type CommunityObservationType = 'ais_target' | 'radar_contact' | 'weather' | 'condition' | 'track_point' | 'system_health' | 'other';
export type CommunityObservationSharingState = 'shareable_no_position' | 'shareable_blurred' | 'shareable_full';
export type CommunityObservationMetricValue = string | number | boolean | null;

export type CommunityObservationPositionUpload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  cog?: number;
  sog?: number;
  source: 'gps' | 'ais' | 'radar' | 'manual' | 'estimated';
  timestamp: string;
};

export type CommunityObservationQuality = {
  confidence: number;
  rejected: false;
  flags: string[];
};

export type CommunityObservationUpload = {
  id: string;
  vesselId: string;
  sourceDeviceId: string;
  sourceProtocol: CommunityObservationSourceProtocol;
  observationType: CommunityObservationType;
  observedAt: string;
  receivedAt: string;
  position?: CommunityObservationPositionUpload;
  sharingState: CommunityObservationSharingState;
  consentCapturedAt: string;
  metrics: Record<string, CommunityObservationMetricValue>;
  quality: CommunityObservationQuality;
  rawPayloadIncluded: false;
  officialChartDataIncluded: false;
};

export type CommunityObservationUploadBatch = {
  id: string;
  schemaVersion: 'harbourmesh.community-observations.v1';
  createdAt: string;
  region: string;
  recordCount: number;
  observations: CommunityObservationUpload[];
  policy: {
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    containsFullSharedPositions: boolean;
    rawLocalPositionsIncluded: false;
    rawSensorPayloadsIncluded: false;
    uploadEndpoint?: string;
  };
};

export type CreateCommunityObservationsOptions = {
  vesselId: string;
  sourceProtocol: CommunityObservationSourceProtocol;
  receivedAt?: string;
  maxPositionAgeMs?: number;
};

export type BuildCommunityObservationUploadBatchOptions = {
  batchId: string;
  createdAt: string;
  region?: string;
  uploadEndpoint?: string;
  maxRecords?: number;
};

const DEFAULT_MAX_POSITION_AGE_MS = 60_000;
const BLURRED_POSITION_DECIMALS = 2;

function isPositionPayload(payload: TelemetryMessage['payload']): payload is PositionPayload {
  return 'latitude' in payload && 'longitude' in payload;
}

function isMotionPayload(payload: TelemetryMessage['payload']): payload is MotionPayload {
  return 'roll' in payload && 'pitch' in payload && 'yaw' in payload;
}

function isEnvironmentPayload(payload: TelemetryMessage['payload']): payload is EnvironmentPayload {
  return (
    'waterTemperature' in payload ||
    'windSpeed' in payload ||
    'windDirection' in payload ||
    'barometricPressure' in payload ||
    'airTemperature' in payload ||
    'humidity' in payload ||
    'waveHeight' in payload ||
    'currentSpeed' in payload ||
    'visibility' in payload
  );
}

function isAISPayload(payload: TelemetryMessage['payload']): payload is AISPayload {
  return 'mmsi' in payload && 'position' in payload && 'cog' in payload && 'sog' in payload;
}

function isHealthPayload(payload: TelemetryMessage['payload']): payload is HealthPayload {
  return 'deviceId' in payload && 'deviceType' in payload && 'status' in payload && 'uptime' in payload;
}

function isWeatherPayload(payload: TelemetryMessage['payload']): payload is WeatherPayload {
  return 'source' in payload && (
    'temperature' in payload ||
    'humidity' in payload ||
    'pressure' in payload ||
    'windSpeed' in payload ||
    'windDirection' in payload ||
    'precipitation' in payload ||
    'conditions' in payload
  );
}

function roundPosition(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function compactMetrics(input: Record<string, CommunityObservationMetricValue | undefined>): Record<string, CommunityObservationMetricValue> {
  return Object.entries(input).reduce<Record<string, CommunityObservationMetricValue>>((metrics, [key, value]) => {
    if (value !== undefined && (typeof value !== 'number' || Number.isFinite(value))) {
      metrics[key] = value;
    }

    return metrics;
  }, {});
}

function hasMetrics(metrics: Record<string, CommunityObservationMetricValue>): boolean {
  return Object.keys(metrics).length > 0;
}

function positionFromPositionPayload(message: TelemetryMessage, payload: PositionPayload): CommunityObservationPositionUpload {
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
    altitude: payload.altitude,
    cog: payload.cog,
    sog: payload.sog,
    source: 'gps',
    timestamp: message.timestamp,
  };
}

function positionFromAISPayload(message: TelemetryMessage, payload: AISPayload): CommunityObservationPositionUpload {
  return {
    latitude: payload.position.latitude,
    longitude: payload.position.longitude,
    cog: payload.cog,
    sog: payload.sog,
    heading: payload.heading,
    source: 'ais',
    timestamp: payload.timestamp || message.timestamp,
  };
}

function findNearestPosition(
  messages: TelemetryMessage[],
  timestamp: string,
  maxPositionAgeMs: number
): CommunityObservationPositionUpload | undefined {
  const targetTime = new Date(timestamp).getTime();
  let nearest: { position: CommunityObservationPositionUpload; ageMs: number } | null = null;

  for (const message of messages) {
    if (message.messageType !== TelemetryMessageType.POSITION || !isPositionPayload(message.payload)) continue;

    const ageMs = Math.abs(new Date(message.timestamp).getTime() - targetTime);
    if (ageMs > maxPositionAgeMs) continue;

    if (!nearest || ageMs < nearest.ageMs) {
      nearest = {
        position: positionFromPositionPayload(message, message.payload),
        ageMs,
      };
    }
  }

  return nearest?.position;
}

function applyConsentToPosition(
  position: CommunityObservationPositionUpload | undefined,
  sharePosition: SharePositionLevel
): { position?: CommunityObservationPositionUpload; sharingState: CommunityObservationSharingState } {
  if (!position || sharePosition === SharePositionLevel.NONE) {
    return { sharingState: 'shareable_no_position' };
  }

  if (sharePosition === SharePositionLevel.BLURRED) {
    return {
      sharingState: 'shareable_blurred',
      position: {
        latitude: roundPosition(position.latitude, BLURRED_POSITION_DECIMALS),
        longitude: roundPosition(position.longitude, BLURRED_POSITION_DECIMALS),
        accuracy: Math.max(position.accuracy ?? 1000, 1000),
        source: position.source,
        timestamp: position.timestamp,
      },
    };
  }

  return {
    sharingState: 'shareable_full',
    position,
  };
}

function scoreObservationQuality(sourceProtocol: CommunityObservationSourceProtocol, baseConfidence?: number): CommunityObservationQuality | null {
  const flags: string[] = [];
  let confidence = typeof baseConfidence === 'number' ? baseConfidence : 0.85;

  if (sourceProtocol === 'simulated') {
    flags.push('simulated_source');
    confidence -= 0.35;
  }

  const boundedConfidence = Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
  if (boundedConfidence < 0.35) return null;

  return {
    confidence: boundedConfidence,
    rejected: false,
    flags,
  };
}

function deriveObservationCore(
  message: TelemetryMessage
): { observationType: CommunityObservationType; metrics: Record<string, CommunityObservationMetricValue>; position?: CommunityObservationPositionUpload } | null {
  if (message.messageType === TelemetryMessageType.POSITION && isPositionPayload(message.payload)) {
    return {
      observationType: 'track_point',
      position: positionFromPositionPayload(message, message.payload),
      metrics: compactMetrics({
        cogDegrees: message.payload.cog,
        sogKnots: message.payload.sog,
        fixType: message.payload.fixType,
        satellites: message.payload.satellites,
      }),
    };
  }

  if (message.messageType === TelemetryMessageType.AIS && isAISPayload(message.payload)) {
    return {
      observationType: 'ais_target',
      position: positionFromAISPayload(message, message.payload),
      metrics: compactMetrics({
        targetType: message.payload.vesselType,
        sogKnots: message.payload.sog,
        cogDegrees: message.payload.cog,
        headingDegrees: message.payload.heading,
        hasName: Boolean(message.payload.name),
        hasCallSign: Boolean(message.payload.callSign),
      }),
    };
  }

  if (message.messageType === TelemetryMessageType.ENVIRONMENT && isEnvironmentPayload(message.payload)) {
    return {
      observationType: 'condition',
      metrics: compactMetrics({
        waterTemperatureC: message.payload.waterTemperature,
        windSpeedKnots: message.payload.windSpeed,
        windDirectionDegrees: message.payload.windDirection,
        apparentWindSpeedKnots: message.payload.windSpeedApparent,
        apparentWindDirectionDegrees: message.payload.windDirectionApparent,
        pressureHPa: message.payload.barometricPressure,
        airTemperatureC: message.payload.airTemperature,
        humidityPercent: message.payload.humidity,
        waveHeightMeters: message.payload.waveHeight,
        wavePeriodSeconds: message.payload.wavePeriod,
        waveDirectionDegrees: message.payload.waveDirection,
        currentSpeedKnots: message.payload.currentSpeed,
        currentDirectionDegrees: message.payload.currentDirection,
        visibilityNauticalMiles: message.payload.visibility,
      }),
    };
  }

  if (message.messageType === TelemetryMessageType.MOTION && isMotionPayload(message.payload)) {
    return {
      observationType: 'condition',
      metrics: compactMetrics({
        rollDegrees: message.payload.roll,
        pitchDegrees: message.payload.pitch,
        yawDegrees: message.payload.yaw,
        heaveMeters: message.payload.heave,
      }),
    };
  }

  if (message.messageType === TelemetryMessageType.WEATHER && isWeatherPayload(message.payload)) {
    return {
      observationType: 'weather',
      metrics: compactMetrics({
        source: message.payload.source,
        temperatureC: message.payload.temperature,
        humidityPercent: message.payload.humidity,
        pressureHPa: message.payload.pressure,
        windSpeedKnots: message.payload.windSpeed,
        windDirectionDegrees: message.payload.windDirection,
        precipitation: message.payload.precipitation,
        conditions: message.payload.conditions,
        forecastTime: message.payload.forecastTime,
      }),
    };
  }

  if (message.messageType === TelemetryMessageType.HEALTH && isHealthPayload(message.payload)) {
    return {
      observationType: 'system_health',
      metrics: compactMetrics({
        deviceType: message.payload.deviceType,
        status: message.payload.status,
        cpuUsage: message.payload.cpuUsage,
        memoryUsage: message.payload.memoryUsage,
        diskUsage: message.payload.diskUsage,
        temperatureC: message.payload.temperature,
        uptimeSeconds: message.payload.uptime,
        errorCount: message.payload.errors?.length,
      }),
    };
  }

  return null;
}

export function createCommunityObservationsFromTelemetry(
  messages: TelemetryMessage[],
  consent: ConsentSettings | null,
  options: CreateCommunityObservationsOptions
): CommunityObservationUpload[] {
  if (!consent?.shareTelemetryForCommunity) return [];

  const receivedAt = options.receivedAt ?? new Date().toISOString();
  const maxPositionAgeMs = options.maxPositionAgeMs ?? DEFAULT_MAX_POSITION_AGE_MS;

  return messages.flatMap((message) => {
    const core = deriveObservationCore(message);
    if (!core || !hasMetrics(core.metrics)) return [];

    const basePosition = core.position ?? findNearestPosition(messages, message.timestamp, maxPositionAgeMs);
    const { position, sharingState } = applyConsentToPosition(basePosition, consent.shareLivePosition);
    const quality = scoreObservationQuality(options.sourceProtocol, message.confidence);
    if (!quality) return [];

    return [{
      id: `${message.id}:observation`,
      vesselId: options.vesselId,
      sourceDeviceId: message.sourceDeviceId,
      sourceProtocol: options.sourceProtocol,
      observationType: core.observationType,
      observedAt: message.timestamp,
      receivedAt: message.receivedAt ?? receivedAt,
      position,
      sharingState,
      consentCapturedAt: consent.lastUpdated,
      metrics: core.metrics,
      quality,
      rawPayloadIncluded: false,
      officialChartDataIncluded: false,
    }];
  });
}

export function buildCommunityObservationUploadBatch(
  observations: CommunityObservationUpload[],
  options: BuildCommunityObservationUploadBatchOptions
): CommunityObservationUploadBatch | null {
  const records = observations.slice(0, options.maxRecords ?? 250);
  if (records.length === 0) return null;

  return {
    id: options.batchId,
    schemaVersion: 'harbourmesh.community-observations.v1',
    createdAt: options.createdAt,
    region: options.region ?? 'NB_PILOT',
    recordCount: records.length,
    observations: records,
    policy: {
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      containsFullSharedPositions: records.some((record) => record.sharingState === 'shareable_full'),
      rawLocalPositionsIncluded: false,
      rawSensorPayloadsIncluded: false,
      uploadEndpoint: options.uploadEndpoint,
    },
  };
}

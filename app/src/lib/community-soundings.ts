import { SharePositionLevel, TelemetryMessageType, type ConsentSettings, type EnvironmentPayload, type PositionPayload, type TelemetryMessage } from '@/types';

export type DepthReference = 'below_surface' | 'below_transducer' | 'below_keel' | 'unknown';
export type SoundingSourceProtocol = 'signalk' | 'nmea0183' | 'nmea2000' | 'manual' | 'replay' | 'simulated' | 'phone';
export type SoundingShareState = 'local_only' | 'shareable_blurred' | 'shareable_full';

export type SoundingOffsets = {
  surfaceToTransducerMeters?: number;
  transducerToKeelMeters?: number;
  gnssToTransducerMeters?: {
    forward: number;
    starboard: number;
  };
};

export type SoundingQuality = {
  confidence: number;
  rejected: boolean;
  flags: string[];
};

export type RawDepthSounding = {
  id: string;
  vesselId: string;
  sourceDeviceId: string;
  sourceProtocol: SoundingSourceProtocol;
  rawMessageId: string;
  timestamp: string;
  receivedAt: string;
  position: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
  rawDepthMeters: number;
  depthMeters: number;
  depthReference: DepthReference;
  tideCorrectionApplied: false;
  waterLevelCorrectionApplied: false;
  offsets: SoundingOffsets;
  navigation?: {
    sogKnots?: number;
    cogDegrees?: number;
  };
  environment?: {
    waterTemperatureC?: number;
  };
  consent: {
    shareTelemetryForCommunity: boolean;
    shareLivePosition: SharePositionLevel;
    telemetryAnonymization: ConsentSettings['telemetryAnonymization'];
    capturedAt: string;
  };
  sharing: {
    state: SoundingShareState;
    uploadLatitude?: number;
    uploadLongitude?: number;
  };
  quality: SoundingQuality;
};

export type SoundingExtractionOptions = {
  vesselId: string;
  sourceProtocol: SoundingSourceProtocol;
  offsets?: SoundingOffsets;
  receivedAt?: string;
  maxPositionAgeMs?: number;
  maxDepthJumpMeters?: number;
};

export type CommunitySoundingUpload = Pick<
  RawDepthSounding,
  'id' | 'vesselId' | 'timestamp' | 'rawDepthMeters' | 'depthMeters' | 'depthReference' | 'quality' | 'offsets'
> & {
  latitude: number;
  longitude: number;
  sourceDeviceId: string;
  sourceProtocol: SoundingSourceProtocol;
  rawMessageId: string;
  receivedAt: string;
  sharingState: Exclude<SoundingShareState, 'local_only'>;
  consentCapturedAt: string;
  tideCorrectionApplied: false;
  waterLevelCorrectionApplied: false;
};

export type CommunitySoundingUploadBatch = {
  id: string;
  schemaVersion: 'harbourmesh.community-soundings.v1';
  createdAt: string;
  region: string;
  recordCount: number;
  records: CommunitySoundingUpload[];
  policy: {
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    containsFullSharedPositions: boolean;
    rawLocalPositionsIncluded: false;
    uploadEndpoint?: string;
  };
};

export type BuildCommunitySoundingUploadBatchOptions = {
  batchId: string;
  createdAt: string;
  region?: string;
  uploadEndpoint?: string;
  maxRecords?: number;
};

const DEFAULT_MAX_POSITION_AGE_MS = 60_000;
const DEFAULT_MAX_DEPTH_JUMP_METERS = 20;
const DEPTH_JUMP_WINDOW_MS = 15_000;
const BLURRED_POSITION_DECIMALS = 2;

function isEnvironmentPayload(payload: TelemetryMessage['payload']): payload is EnvironmentPayload {
  return (
    'depth' in payload ||
    'depthBelowKeel' in payload ||
    'depthBelowTransducer' in payload ||
    'waterTemperature' in payload
  );
}

function isPositionPayload(payload: TelemetryMessage['payload']): payload is PositionPayload {
  return 'latitude' in payload && 'longitude' in payload;
}

function getDepth(payload: EnvironmentPayload): { rawDepthMeters: number; depthReference: DepthReference } | null {
  if (typeof payload.depthBelowTransducer === 'number') {
    return { rawDepthMeters: payload.depthBelowTransducer, depthReference: 'below_transducer' };
  }

  if (typeof payload.depth === 'number') {
    return { rawDepthMeters: payload.depth, depthReference: 'below_surface' };
  }

  if (typeof payload.depthBelowKeel === 'number') {
    return { rawDepthMeters: payload.depthBelowKeel, depthReference: 'below_keel' };
  }

  return null;
}

function normalizeDepth(rawDepthMeters: number, reference: DepthReference, offsets: SoundingOffsets): number {
  if (reference === 'below_transducer' && typeof offsets.surfaceToTransducerMeters === 'number') {
    return rawDepthMeters + offsets.surfaceToTransducerMeters;
  }

  return rawDepthMeters;
}

function roundPosition(value: number, decimals: number): number {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function getSharingState(consent: ConsentSettings): SoundingShareState {
  if (!consent.shareTelemetryForCommunity || consent.shareLivePosition === SharePositionLevel.NONE) {
    return 'local_only';
  }

  return consent.shareLivePosition === SharePositionLevel.FULL ? 'shareable_full' : 'shareable_blurred';
}

function getUploadPosition(
  position: PositionPayload,
  sharingState: SoundingShareState
): { uploadLatitude?: number; uploadLongitude?: number } {
  if (sharingState === 'local_only') return {};

  if (sharingState === 'shareable_blurred') {
    return {
      uploadLatitude: roundPosition(position.latitude, BLURRED_POSITION_DECIMALS),
      uploadLongitude: roundPosition(position.longitude, BLURRED_POSITION_DECIMALS),
    };
  }

  return {
    uploadLatitude: position.latitude,
    uploadLongitude: position.longitude,
  };
}

function scoreSoundingQuality(input: {
  rawDepthMeters: number;
  depthReference: DepthReference;
  position: PositionPayload | null;
  offsets: SoundingOffsets;
  sourceProtocol: SoundingSourceProtocol;
}): SoundingQuality {
  const flags: string[] = [];
  let confidence = 1;

  if (!input.position) {
    flags.push('missing_position');
    confidence -= 0.5;
  } else {
    if (typeof input.position.accuracy === 'number' && input.position.accuracy > 25) {
      flags.push('low_gnss_accuracy');
      confidence -= 0.2;
    }

    if (typeof input.position.sog === 'number' && input.position.sog > 25) {
      flags.push('high_speed');
      confidence -= 0.15;
    }
  }

  if (input.rawDepthMeters <= 0 || input.rawDepthMeters > 250) {
    flags.push('depth_out_of_range');
    confidence -= 0.5;
  }

  if (input.depthReference === 'below_transducer' && typeof input.offsets.surfaceToTransducerMeters !== 'number') {
    flags.push('missing_surface_to_transducer_offset');
    confidence -= 0.15;
  }

  if (input.sourceProtocol === 'simulated') {
    flags.push('simulated_source');
    confidence -= 0.35;
  }

  const boundedConfidence = Math.max(0, Math.min(1, Number(confidence.toFixed(2))));

  return {
    confidence: boundedConfidence,
    rejected: flags.includes('missing_position') || flags.includes('depth_out_of_range') || boundedConfidence < 0.35,
    flags,
  };
}

function applyDepthJumpQuality(
  quality: SoundingQuality,
  input: {
    currentDepthMeters: number;
    currentTimestamp: string;
    previousSounding?: RawDepthSounding;
    maxDepthJumpMeters: number;
  }
): SoundingQuality {
  if (!input.previousSounding) return quality;

  const currentTime = new Date(input.currentTimestamp).getTime();
  const previousTime = new Date(input.previousSounding.timestamp).getTime();
  if (Number.isNaN(currentTime) || Number.isNaN(previousTime)) return quality;

  const elapsedMs = Math.abs(currentTime - previousTime);
  const depthDeltaMeters = Math.abs(input.currentDepthMeters - input.previousSounding.depthMeters);
  if (elapsedMs > DEPTH_JUMP_WINDOW_MS || depthDeltaMeters <= input.maxDepthJumpMeters) return quality;

  const flags = Array.from(new Set([...quality.flags, 'abrupt_depth_jump']));
  const confidencePenalty = depthDeltaMeters > input.maxDepthJumpMeters * 2 ? 0.5 : 0.25;
  const confidence = Math.max(0, Number((quality.confidence - confidencePenalty).toFixed(2)));

  return {
    confidence,
    rejected: quality.rejected || confidence < 0.35 || depthDeltaMeters > input.maxDepthJumpMeters * 2,
    flags,
  };
}

function findNearestPosition(
  messages: TelemetryMessage[],
  timestamp: string,
  maxPositionAgeMs: number
): TelemetryMessage | null {
  const targetTime = new Date(timestamp).getTime();

  let nearest: { message: TelemetryMessage; ageMs: number } | null = null;

  for (const message of messages) {
    if (message.messageType !== TelemetryMessageType.POSITION || !isPositionPayload(message.payload)) continue;

    const ageMs = Math.abs(new Date(message.timestamp).getTime() - targetTime);
    if (ageMs > maxPositionAgeMs) continue;

    if (!nearest || ageMs < nearest.ageMs) {
      nearest = { message, ageMs };
    }
  }

  return nearest?.message ?? null;
}

export function createSoundingsFromTelemetry(
  messages: TelemetryMessage[],
  consent: ConsentSettings | null,
  options: SoundingExtractionOptions
): RawDepthSounding[] {
  if (!consent) return [];

  const receivedAt = options.receivedAt ?? new Date().toISOString();
  const offsets = options.offsets ?? {};
  const maxPositionAgeMs = options.maxPositionAgeMs ?? DEFAULT_MAX_POSITION_AGE_MS;
  const maxDepthJumpMeters = options.maxDepthJumpMeters ?? DEFAULT_MAX_DEPTH_JUMP_METERS;
  const lastSoundingBySource = new Map<string, RawDepthSounding>();
  const soundings: RawDepthSounding[] = [];

  for (const message of messages) {
    if (message.messageType !== TelemetryMessageType.ENVIRONMENT || !isEnvironmentPayload(message.payload)) continue;

    const depth = getDepth(message.payload);
    if (!depth) continue;

    const positionMessage = findNearestPosition(messages, message.timestamp, maxPositionAgeMs);
    const position = positionMessage && isPositionPayload(positionMessage.payload) ? positionMessage.payload : null;
    if (!position) continue;

    const sharingState = getSharingState(consent);
    const normalizedDepthMeters = normalizeDepth(depth.rawDepthMeters, depth.depthReference, offsets);
    const sourceKey = `${message.sourceDeviceId}:${depth.depthReference}`;
    const baseQuality = scoreSoundingQuality({
      rawDepthMeters: depth.rawDepthMeters,
      depthReference: depth.depthReference,
      position,
      offsets,
      sourceProtocol: options.sourceProtocol,
    });
    const quality = applyDepthJumpQuality(baseQuality, {
      currentDepthMeters: normalizedDepthMeters,
      currentTimestamp: message.timestamp,
      previousSounding: lastSoundingBySource.get(sourceKey),
      maxDepthJumpMeters,
    });

    const sounding: RawDepthSounding = {
      id: `${message.id}:sounding`,
      vesselId: options.vesselId,
      sourceDeviceId: message.sourceDeviceId,
      sourceProtocol: options.sourceProtocol,
      rawMessageId: message.id,
      timestamp: message.timestamp,
      receivedAt,
      position: {
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
      },
      rawDepthMeters: depth.rawDepthMeters,
      depthMeters: normalizedDepthMeters,
      depthReference: depth.depthReference,
      tideCorrectionApplied: false,
      waterLevelCorrectionApplied: false,
      offsets,
      navigation: {
        sogKnots: position.sog,
        cogDegrees: position.cog,
      },
      environment: {
        waterTemperatureC: message.payload.waterTemperature,
      },
      consent: {
        shareTelemetryForCommunity: consent.shareTelemetryForCommunity,
        shareLivePosition: consent.shareLivePosition,
        telemetryAnonymization: consent.telemetryAnonymization,
        capturedAt: consent.lastUpdated,
      },
      sharing: {
        state: sharingState,
        ...getUploadPosition(position, sharingState),
      },
      quality,
    };

    soundings.push(sounding);
    lastSoundingBySource.set(sourceKey, sounding);
  }

  return soundings;
}

export function prepareSoundingForCommunityUpload(sounding: RawDepthSounding): CommunitySoundingUpload | null {
  if (sounding.quality.rejected || sounding.sharing.state === 'local_only') return null;
  if (sounding.sharing.uploadLatitude === undefined || sounding.sharing.uploadLongitude === undefined) return null;

  return {
    id: sounding.id,
    vesselId: sounding.vesselId,
    timestamp: sounding.timestamp,
    latitude: sounding.sharing.uploadLatitude,
    longitude: sounding.sharing.uploadLongitude,
    sourceDeviceId: sounding.sourceDeviceId,
    sourceProtocol: sounding.sourceProtocol,
    rawMessageId: sounding.rawMessageId,
    receivedAt: sounding.receivedAt,
    sharingState: sounding.sharing.state as Exclude<SoundingShareState, 'local_only'>,
    consentCapturedAt: sounding.consent.capturedAt,
    rawDepthMeters: sounding.rawDepthMeters,
    depthMeters: sounding.depthMeters,
    depthReference: sounding.depthReference,
    tideCorrectionApplied: false,
    waterLevelCorrectionApplied: false,
    offsets: sounding.offsets,
    quality: sounding.quality,
  };
}

export function buildCommunitySoundingUploadBatch(
  soundings: RawDepthSounding[],
  options: BuildCommunitySoundingUploadBatchOptions
): CommunitySoundingUploadBatch | null {
  const maxRecords = options.maxRecords ?? 250;
  const records = soundings
    .flatMap((sounding) => {
      const upload = prepareSoundingForCommunityUpload(sounding);
      return upload ? [upload] : [];
    })
    .slice(0, maxRecords);

  if (records.length === 0) return null;

  return {
    id: options.batchId,
    schemaVersion: 'harbourmesh.community-soundings.v1',
    createdAt: options.createdAt,
    region: options.region ?? 'NB_PILOT',
    recordCount: records.length,
    records,
    policy: {
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      containsFullSharedPositions: records.some((record) => record.sharingState === 'shareable_full'),
      rawLocalPositionsIncluded: false,
      uploadEndpoint: options.uploadEndpoint,
    },
  };
}

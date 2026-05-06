import { z } from 'zod';

const observationPositionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  altitude: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().nonnegative().optional(),
  cog: z.number().min(0).max(360).optional(),
  sog: z.number().nonnegative().optional(),
  source: z.enum(['gps', 'ais', 'radar', 'manual', 'estimated']),
  timestamp: z.string().datetime(),
}).strict();

const observationMetricValueSchema = z.union([
  z.string().trim().min(1).max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const observationMetricsSchema = z.record(
  z.string().trim().regex(/^[a-zA-Z0-9_.:-]{1,80}$/),
  observationMetricValueSchema
).refine((metrics) => Object.keys(metrics).length > 0, {
  message: 'metrics must include at least one value',
}).refine((metrics) => Object.keys(metrics).length <= 40, {
  message: 'metrics cannot include more than 40 values',
});

const observationQualitySchema = z.object({
  confidence: z.number().min(0).max(1),
  rejected: z.literal(false),
  flags: z.array(z.string().trim().min(1).max(80)).max(20),
}).strict();

export const communityObservationUploadSchema = z.object({
  id: z.string().min(1),
  vesselId: z.string().min(1),
  sourceDeviceId: z.string().min(1),
  sourceProtocol: z.enum(['signalk', 'nmea0183', 'nmea2000', 'manual', 'replay', 'simulated']),
  observationType: z.enum(['ais_target', 'radar_contact', 'weather', 'condition', 'track_point', 'system_health', 'other']),
  observedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  position: observationPositionSchema.optional(),
  sharingState: z.enum(['shareable_no_position', 'shareable_blurred', 'shareable_full']),
  consentCapturedAt: z.string().datetime(),
  metrics: observationMetricsSchema,
  quality: observationQualitySchema,
  rawPayloadIncluded: z.literal(false),
  officialChartDataIncluded: z.literal(false),
}).strict().superRefine((observation, context) => {
  if (observation.sharingState === 'shareable_no_position' && observation.position) {
    context.addIssue({
      code: 'custom',
      path: ['position'],
      message: 'position must be omitted when sharingState is shareable_no_position',
    });
  }

  if (observation.sharingState !== 'shareable_no_position' && !observation.position) {
    context.addIssue({
      code: 'custom',
      path: ['position'],
      message: 'position is required when sharing a positioned observation',
    });
  }
});

export const communityObservationBatchSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal('harbourmesh.community-observations.v1'),
  createdAt: z.string().datetime(),
  region: z.string().min(1),
  recordCount: z.number().int().positive(),
  observations: z.array(communityObservationUploadSchema).min(1).max(250),
  policy: z.object({
    intendedUse: z.literal('community_reference_overlay'),
    officialChartDataIncluded: z.literal(false),
    containsFullSharedPositions: z.boolean(),
    rawLocalPositionsIncluded: z.literal(false),
    rawSensorPayloadsIncluded: z.literal(false),
    uploadEndpoint: z.string().optional(),
  }).strict(),
}).strict().superRefine((batch, context) => {
  if (batch.recordCount !== batch.observations.length) {
    context.addIssue({
      code: 'custom',
      path: ['recordCount'],
      message: 'recordCount must match observations.length',
    });
  }

  const hasFullSharedPositions = batch.observations.some((observation) => observation.sharingState === 'shareable_full');
  if (batch.policy.containsFullSharedPositions !== hasFullSharedPositions) {
    context.addIssue({
      code: 'custom',
      path: ['policy', 'containsFullSharedPositions'],
      message: 'containsFullSharedPositions must match observation sharing states',
    });
  }
});

export type CommunityObservationUpload = z.infer<typeof communityObservationUploadSchema>;
export type CommunityObservationBatch = z.infer<typeof communityObservationBatchSchema>;

export type CommunityObservationReceipt = {
  ok: true;
  receiptId: string;
  batchId: string;
  acceptedCount: number;
  duplicateCount: number;
  storedAt: string;
};

export type CommunityObservationSummary = {
  totalRecords: number;
  batchCount: number;
  regions: Record<string, number>;
  byType: Record<string, number>;
  positionedRecords: number;
  latestObservedAt?: string;
};
